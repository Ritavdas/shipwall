import { z } from "zod";
import { auth } from "@/infra/auth";
import { flags } from "@/infra/env";
import {
  getEventBySlug,
  upsertBuilder,
  countBuilderSubmissions,
  createSubmission,
  awardBadges,
  listSubmissionCards,
} from "@/infra/store";
import { computeBadges } from "@/domain/badges";
import { normalizeStack } from "@/domain/stack";
import { normalizeNeeds } from "@/domain/needs";
import {
  normalizeProjectMedia,
  projectMediaInputSchema,
  webUrlSchema,
} from "@/domain/media";

const Body = z.object({
  eventSlug: z.string().min(1),
  projectUrl: webUrlSchema,
  title: z.string().min(1).max(120),
  description: z.string().max(400).optional().default(""),
  problem: z.string().max(400).optional().default(""),
  repoUrl: webUrlSchema.optional(),
  screenshotUrl: webUrlSchema.optional(),
  media: z.array(projectMediaInputSchema).max(12).optional(),
  source: z.enum(["github", "link"]).default("link"),
  stack: z.array(z.string()).default([]),
  needs: z.array(z.string()).default([]),
  isAi: z.boolean().default(false),
});

/** POST — create a submission (requires GitHub sign-in). */
export async function POST(req: Request) {
  if (!flags.hasDb) {
    return Response.json(
      { error: "Server has no DATABASE_URL configured." },
      { status: 503 },
    );
  }
  const session = await auth();
  if (!session?.githubId || !session.login) {
    return Response.json({ error: "Sign in with GitHub first." }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Check the project details and media URLs, then try again." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const event = await getEventBySlug(input.eventSlug);
  if (!event) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  const builder = await upsertBuilder({
    githubId: session.githubId,
    handle: session.login,
    name: session.displayName ?? null,
    avatarUrl: session.avatarUrl ?? null,
  });

  const prior = await countBuilderSubmissions(builder.id);
  const stack = normalizeStack(input.stack);
  const needs = normalizeNeeds(input.needs);
  const media = (
    input.media ??
    (input.screenshotUrl
      ? [
          {
            kind: "image" as const,
            url: input.screenshotUrl,
            altText: `${input.title} project preview`,
            caption: "",
          },
        ]
      : [])
  ).map(normalizeProjectMedia);
  const screenshotUrl =
    media.find((item) => item.kind === "image")?.url ??
    (input.media === undefined ? input.screenshotUrl : undefined);

  const submission = await createSubmission(
    {
      eventId: event.id,
      builderId: builder.id,
      title: input.title,
      description: input.description || null,
      problem: input.problem || null,
      projectUrl: input.projectUrl,
      repoUrl: input.repoUrl || null,
      source: input.source,
      stack,
      needs,
      screenshotUrl: screenshotUrl || null,
      isAi: input.isAi,
    },
    media,
  );

  const badgeKinds = computeBadges({
    priorSubmissionCount: prior,
    isAi: input.isAi,
    stack,
  });
  await awardBadges(builder.id, submission.id, badgeKinds);

  return Response.json({ id: submission.id, badges: badgeKinds });
}

/** GET ?event=slug — list submissions for the Ship Wall. */
export async function GET(req: Request) {
  if (!flags.hasDb) {
    return Response.json({ event: null, count: 0, submissions: [] });
  }
  const slug = new URL(req.url).searchParams.get("event");
  if (!slug) {
    return Response.json({ error: "Missing event." }, { status: 400 });
  }
  const event = await getEventBySlug(slug);
  if (!event) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }
  const submissions = await listSubmissionCards(event.id);
  return Response.json({
    event: { slug: event.slug, name: event.name, city: event.city },
    count: submissions.length,
    submissions,
  });
}
