import { revalidatePath } from "next/cache";
import { createCommentSchema, projectIdSchema } from "@/domain/interactions";
import { flags } from "@/infra/env";
import { getCurrentBuilder } from "@/infra/identity";
import {
  createRateLimitedProjectComment,
  getProjectOwnerBuilderId,
} from "@/infra/store";

const COMMENT_WINDOW_SECONDS = 10 * 60;
const COMMENT_LIMIT_PER_WINDOW = 5;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!flags.hasDb) {
    return Response.json(
      { error: "Comments are unavailable because the database is not configured." },
      { status: 503 },
    );
  }

  const projectId = projectIdSchema.safeParse((await params).id);
  if (!projectId.success) {
    return Response.json(
      { error: projectId.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const projectOwnerId = await getProjectOwnerBuilderId(projectId.data);
  if (!projectOwnerId) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }
  const identity = await getCurrentBuilder();
  if (!identity) {
    return Response.json(
      { error: "Sign in with GitHub to add a comment." },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Check the comment and retry." },
      { status: 400 },
    );
  }

  const comment = await createRateLimitedProjectComment({
    submissionId: projectId.data,
    builderId: identity.builder.id,
    body: parsed.data.body,
    windowSeconds: COMMENT_WINDOW_SECONDS,
    limit: COMMENT_LIMIT_PER_WINDOW,
  });
  if (!comment) {
    return Response.json(
      {
        error:
          "You have posted several comments recently. Wait a few minutes before adding another.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(COMMENT_WINDOW_SECONDS) },
      },
    );
  }

  revalidatePath(`/projects/${projectId.data}`);

  return Response.json(
    {
      comment: {
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        author: {
          handle: identity.builder.handle,
          name: identity.builder.name,
          avatarUrl: identity.builder.avatarUrl,
        },
        canDelete: true,
      },
    },
    { status: 201 },
  );
}
