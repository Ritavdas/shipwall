import { eq, desc, asc, inArray, count } from "drizzle-orm";
import { requireDb } from "@/infra/db/client";
import {
  events,
  builders,
  submissions,
  projectMedia,
  badges,
} from "@/infra/db/schema";
import type { BadgeKind } from "@/domain/badges";
import type {
  ProjectMediaInput,
  ProjectMediaKind,
} from "@/domain/media";

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
  event: {
    slug: string;
    name: string;
    city: string;
    eventDate: string | null;
  };
  media: ProjectMediaItem[];
};

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
