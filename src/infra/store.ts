import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import { requireDb } from "@/infra/db/client";
import {
  events,
  builders,
  submissions,
  projectMedia,
  projectComments,
  projectReactions,
  badges,
} from "@/infra/db/schema";
import type { BadgeKind } from "@/domain/badges";
import type {
  ProjectMediaInput,
  ProjectMediaKind,
} from "@/domain/media";
import {
  REACTION_KINDS,
  type ReactionKind,
} from "@/domain/interactions";

export type SubmissionCard = {
  id: string;
  title: string;
  description: string | null;
  problem: string | null;
  projectUrl: string;
  repoUrl: string | null;
  source: string;
  stack: string[];
  needs: string[];
  screenshotUrl: string | null;
  isAi: boolean;
  createdAt: Date;
  builder: { handle: string; name: string | null; avatarUrl: string | null };
  badges: string[];
};

export type ProjectMediaItem = {
  id: string;
  kind: ProjectMediaKind;
  url: string;
  altText: string | null;
  caption: string | null;
  position: number;
};

export type ProjectDetail = SubmissionCard & {
  ownerBuilderId: string;
  event: {
    slug: string;
    name: string;
    city: string;
    eventDate: string | null;
  };
  media: ProjectMediaItem[];
};

export type ProjectCommentItem = {
  id: string;
  body: string;
  createdAt: Date;
  builderId: string;
  author: {
    handle: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

export type ProjectDiscussion = {
  comments: ProjectCommentItem[];
  commentLimit: number;
  reactionCounts: Record<ReactionKind, number>;
  viewerBuilderId: string | null;
  viewerReactions: ReactionKind[];
};

const PROJECT_COMMENT_LIMIT = 50;

export async function getEventBySlug(slug: string) {
  const db = requireDb();
  const rows = await db.select().from(events).where(eq(events.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function listEvents() {
  const db = requireDb();
  return db.select().from(events).orderBy(desc(events.createdAt));
}

export async function createEvent(input: {
  slug: string;
  name: string;
  city: string;
  eventDate?: string | null;
}) {
  const db = requireDb();
  const rows = await db.insert(events).values(input).returning();
  return rows[0]!;
}

export async function upsertBuilder(input: {
  githubId: string;
  handle: string;
  name?: string | null;
  avatarUrl?: string | null;
}) {
  const db = requireDb();
  const rows = await db
    .insert(builders)
    .values(input)
    .onConflictDoUpdate({
      target: builders.githubId,
      set: {
        handle: input.handle,
        name: input.name ?? null,
        avatarUrl: input.avatarUrl ?? null,
      },
    })
    .returning();
  return rows[0]!;
}

export async function getBuilderByGithubId(githubId: string) {
  const db = requireDb();
  const rows = await db
    .select({ id: builders.id })
    .from(builders)
    .where(eq(builders.githubId, githubId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProjectOwnerBuilderId(submissionId: string) {
  const db = requireDb();
  const rows = await db
    .select({ builderId: submissions.builderId })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);
  return rows[0]?.builderId ?? null;
}

export async function countBuilderSubmissions(builderId: string) {
  const db = requireDb();
  const rows = await db
    .select({ c: count() })
    .from(submissions)
    .where(eq(submissions.builderId, builderId));
  return rows[0]?.c ?? 0;
}

export async function createSubmission(
  input: Omit<typeof submissions.$inferInsert, "id" | "createdAt">,
  media: ProjectMediaInput[],
) {
  const db = requireDb();
  const id = crypto.randomUUID();
  const submissionQuery = db.insert(submissions).values({ ...input, id });

  if (media.length > 0) {
    const mediaQuery = db.insert(projectMedia).values(
      media.map((item, position) => ({
        submissionId: id,
        kind: item.kind,
        url: item.url,
        altText: item.altText || null,
        caption: item.caption || null,
        position,
      })),
    );
    await db.batch([submissionQuery, mediaQuery]);
  } else {
    await submissionQuery;
  }

  return { id };
}

export async function awardBadges(
  builderId: string,
  submissionId: string,
  kinds: BadgeKind[],
) {
  if (kinds.length === 0) return;
  const db = requireDb();
  await db
    .insert(badges)
    .values(kinds.map((kind) => ({ builderId, submissionId, kind })));
}

export async function listSubmissionCards(
  eventId: string,
): Promise<SubmissionCard[]> {
  const db = requireDb();
  const rows = await db
    .select({
      s: submissions,
      handle: builders.handle,
      name: builders.name,
      avatarUrl: builders.avatarUrl,
    })
    .from(submissions)
    .innerJoin(builders, eq(submissions.builderId, builders.id))
    .where(eq(submissions.eventId, eventId))
    .orderBy(desc(submissions.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.s.id);
  const badgeRows = await db
    .select()
    .from(badges)
    .where(inArray(badges.submissionId, ids));

  const byId = new Map<string, string[]>();
  for (const b of badgeRows) {
    if (!b.submissionId) continue;
    const arr = byId.get(b.submissionId) ?? [];
    arr.push(b.kind);
    byId.set(b.submissionId, arr);
  }

  return rows.map((r) => ({
    id: r.s.id,
    title: r.s.title,
    description: r.s.description,
    problem: r.s.problem,
    projectUrl: r.s.projectUrl,
    repoUrl: r.s.repoUrl,
    source: r.s.source,
    stack: r.s.stack,
    needs: r.s.needs,
    screenshotUrl: r.s.screenshotUrl,
    isAi: r.s.isAi,
    createdAt: r.s.createdAt,
    builder: { handle: r.handle, name: r.name, avatarUrl: r.avatarUrl },
    badges: byId.get(r.s.id) ?? [],
  }));
}

export type ShareCard = {
  title: string;
  handle: string;
  avatarUrl: string | null;
  city: string;
  eventName: string;
  stack: string[];
  isAi: boolean;
};

export async function getShareCard(id: string): Promise<ShareCard | null> {
  const db = requireDb();
  const rows = await db
    .select({
      title: submissions.title,
      stack: submissions.stack,
      isAi: submissions.isAi,
      handle: builders.handle,
      avatarUrl: builders.avatarUrl,
      city: events.city,
      eventName: events.name,
    })
    .from(submissions)
    .innerJoin(builders, eq(submissions.builderId, builders.id))
    .innerJoin(events, eq(submissions.eventId, events.id))
    .where(eq(submissions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  const db = requireDb();
  const rows = await db
    .select({
      s: submissions,
      handle: builders.handle,
      name: builders.name,
      avatarUrl: builders.avatarUrl,
      ownerBuilderId: builders.id,
      city: events.city,
      eventName: events.name,
      eventSlug: events.slug,
      eventDate: events.eventDate,
    })
    .from(submissions)
    .innerJoin(builders, eq(submissions.builderId, builders.id))
    .innerJoin(events, eq(submissions.eventId, events.id))
    .where(eq(submissions.id, id))
    .limit(1);
  const r = rows[0];
  if (!r) return null;

  const [badgeRows, mediaRows] = await Promise.all([
    db.select().from(badges).where(eq(badges.submissionId, id)),
    db
      .select()
      .from(projectMedia)
      .where(eq(projectMedia.submissionId, id))
      .orderBy(asc(projectMedia.position)),
  ]);

  const media: ProjectMediaItem[] =
    mediaRows.length > 0
      ? mediaRows.map((item) => ({
          id: item.id,
          kind: item.kind,
          url: item.url,
          altText: item.altText,
          caption: item.caption,
          position: item.position,
        }))
      : r.s.screenshotUrl
        ? [
            {
              id: `legacy-${r.s.id}`,
              kind: "image",
              url: r.s.screenshotUrl,
              altText: `${r.s.title} project preview`,
              caption: null,
              position: 0,
            },
          ]
        : [];

  return {
    id: r.s.id,
    title: r.s.title,
    description: r.s.description,
    problem: r.s.problem,
    projectUrl: r.s.projectUrl,
    repoUrl: r.s.repoUrl,
    source: r.s.source,
    stack: r.s.stack,
    needs: r.s.needs,
    screenshotUrl: r.s.screenshotUrl,
    isAi: r.s.isAi,
    createdAt: r.s.createdAt,
    builder: { handle: r.handle, name: r.name, avatarUrl: r.avatarUrl },
    ownerBuilderId: r.ownerBuilderId,
    badges: badgeRows.map((badge) => badge.kind),
    event: {
      slug: r.eventSlug,
      name: r.eventName,
      city: r.city,
      eventDate: r.eventDate,
    },
    media,
  };
}

export async function getProjectDiscussion(
  submissionId: string,
  viewerGithubId?: string,
): Promise<ProjectDiscussion> {
  const db = requireDb();
  const commentsPromise = db
    .select({
      id: projectComments.id,
      body: projectComments.body,
      createdAt: projectComments.createdAt,
      builderId: projectComments.builderId,
      handle: builders.handle,
      name: builders.name,
      avatarUrl: builders.avatarUrl,
    })
    .from(projectComments)
    .innerJoin(builders, eq(projectComments.builderId, builders.id))
    .where(eq(projectComments.submissionId, submissionId))
    .orderBy(desc(projectComments.createdAt), desc(projectComments.id))
    .limit(PROJECT_COMMENT_LIMIT);
  const countsPromise = db
    .select({ kind: projectReactions.kind, total: count() })
    .from(projectReactions)
    .where(eq(projectReactions.submissionId, submissionId))
    .groupBy(projectReactions.kind);
  const viewerBuilderPromise = viewerGithubId
    ? getBuilderByGithubId(viewerGithubId)
    : Promise.resolve(null);

  const viewerBuilder = await viewerBuilderPromise;
  const viewerReactionsPromise = viewerBuilder
    ? db
        .select({ kind: projectReactions.kind })
        .from(projectReactions)
        .where(
          and(
            eq(projectReactions.submissionId, submissionId),
            eq(projectReactions.builderId, viewerBuilder.id),
          ),
        )
    : Promise.resolve([]);
  const [commentRows, countRows, viewerReactionRows] = await Promise.all([
    commentsPromise,
    countsPromise,
    viewerReactionsPromise,
  ]);
  const reactionCounts = Object.fromEntries(
    REACTION_KINDS.map((kind) => [kind, 0]),
  ) as Record<ReactionKind, number>;
  for (const row of countRows) reactionCounts[row.kind] = row.total;

  return {
    comments: commentRows.reverse().map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      builderId: row.builderId,
      author: {
        handle: row.handle,
        name: row.name,
        avatarUrl: row.avatarUrl,
      },
    })),
    commentLimit: PROJECT_COMMENT_LIMIT,
    reactionCounts,
    viewerBuilderId: viewerBuilder?.id ?? null,
    viewerReactions: viewerReactionRows.map((row) => row.kind),
  };
}

export async function createRateLimitedProjectComment(input: {
  submissionId: string;
  builderId: string;
  body: string;
  windowSeconds: number;
  limit: number;
}) {
  const db = requireDb();
  const id = crypto.randomUUID();
  const [, insertResult] = await db.batch([
    db.execute(sql`
      select pg_advisory_xact_lock(
        hashtext('shipwall-comment-rate'),
        hashtext(${input.builderId})
      )
    `),
    db.execute<{
      id: string;
      body: string;
      createdAt: string | Date;
    }>(sql`
      insert into project_comments (id, submission_id, builder_id, body)
      select
        ${id}::uuid,
        ${input.submissionId}::uuid,
        ${input.builderId}::uuid,
        ${input.body}
      where (
        select count(*)
        from project_comments
        where builder_id = ${input.builderId}::uuid
          and created_at >= now() - (
            ${input.windowSeconds}::double precision * interval '1 second'
          )
      ) < ${input.limit}
      returning id, body, created_at as "createdAt"
    `),
  ]);
  const comment = insertResult.rows[0];
  return comment
    ? {
        ...comment,
        createdAt:
          comment.createdAt instanceof Date
            ? comment.createdAt
            : new Date(comment.createdAt),
      }
    : null;
}

export async function getProjectCommentForModeration(
  submissionId: string,
  commentId: string,
) {
  const db = requireDb();
  const rows = await db
    .select({
      id: projectComments.id,
      builderId: projectComments.builderId,
      ownerBuilderId: submissions.builderId,
    })
    .from(projectComments)
    .innerJoin(submissions, eq(projectComments.submissionId, submissions.id))
    .where(
      and(
        eq(projectComments.id, commentId),
        eq(projectComments.submissionId, submissionId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteProjectComment(
  submissionId: string,
  commentId: string,
) {
  const db = requireDb();
  const rows = await db
    .delete(projectComments)
    .where(
      and(
        eq(projectComments.id, commentId),
        eq(projectComments.submissionId, submissionId),
      ),
    )
    .returning({ id: projectComments.id });
  return rows[0] ?? null;
}

export async function setProjectReaction(input: {
  submissionId: string;
  builderId: string;
  kind: ReactionKind;
  active: boolean;
}) {
  const db = requireDb();
  if (input.active) {
    await db
      .insert(projectReactions)
      .values({
        submissionId: input.submissionId,
        builderId: input.builderId,
        kind: input.kind,
      })
      .onConflictDoNothing({
        target: [
          projectReactions.submissionId,
          projectReactions.builderId,
          projectReactions.kind,
        ],
      });
  } else {
    await db
      .delete(projectReactions)
      .where(
        and(
          eq(projectReactions.submissionId, input.submissionId),
          eq(projectReactions.builderId, input.builderId),
          eq(projectReactions.kind, input.kind),
        ),
      );
  }

  const rows = await db
    .select({ total: count() })
    .from(projectReactions)
    .where(
      and(
        eq(projectReactions.submissionId, input.submissionId),
        eq(projectReactions.kind, input.kind),
      ),
    );
  return rows[0]?.total ?? 0;
}
