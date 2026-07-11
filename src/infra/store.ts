import { eq, desc, inArray, count } from "drizzle-orm";
import { requireDb } from "@/infra/db/client";
import {
  events,
  builders,
  submissions,
  badges,
  type Submission,
} from "@/infra/db/schema";
import type { BadgeKind } from "@/domain/badges";

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
): Promise<Submission> {
  const db = requireDb();
  const rows = await db.insert(submissions).values(input).returning();
  return rows[0]!;
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

export async function getSubmissionCard(
  id: string,
): Promise<SubmissionCard | null> {
  const db = requireDb();
  const rows = await db
    .select({
      s: submissions,
      handle: builders.handle,
      name: builders.name,
      avatarUrl: builders.avatarUrl,
      city: events.city,
      eventName: events.name,
    })
    .from(submissions)
    .innerJoin(builders, eq(submissions.builderId, builders.id))
    .innerJoin(events, eq(submissions.eventId, events.id))
    .where(eq(submissions.id, id))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
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
    badges: [],
  };
}
