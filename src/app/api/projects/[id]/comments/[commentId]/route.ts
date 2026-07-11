import { revalidatePath } from "next/cache";
import { commentIdSchema, projectIdSchema } from "@/domain/interactions";
import { isAdmin } from "@/infra/admin";
import { flags } from "@/infra/env";
import { getCurrentBuilder } from "@/infra/identity";
import {
  deleteProjectComment,
  getProjectCommentForModeration,
  getProjectOwnerBuilderId,
} from "@/infra/store";

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; commentId: string }> },
) {
  if (!flags.hasDb) {
    return Response.json(
      { error: "Comments are unavailable because the database is not configured." },
      { status: 503 },
    );
  }

  const routeParams = await params;
  const projectId = projectIdSchema.safeParse(routeParams.id);
  const commentId = commentIdSchema.safeParse(routeParams.commentId);
  if (!projectId.success || !commentId.success) {
    return Response.json(
      {
        error:
          projectId.error?.issues[0]?.message ??
          commentId.error?.issues[0]?.message,
      },
      { status: 400 },
    );
  }
  const projectOwnerId = await getProjectOwnerBuilderId(projectId.data);
  if (!projectOwnerId) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }
  const comment = await getProjectCommentForModeration(
    projectId.data,
    commentId.data,
  );
  if (!comment) {
    return Response.json({ error: "Comment not found." }, { status: 404 });
  }

  const identity = await getCurrentBuilder();
  const organizer = isAdmin(request);
  if (!identity && !organizer) {
    return Response.json(
      { error: "Sign in with GitHub to delete your comment." },
      { status: 401 },
    );
  }
  const builderId = identity?.builder.id;
  const canDelete =
    organizer ||
    builderId === comment.builderId ||
    builderId === comment.ownerBuilderId;
  if (!canDelete) {
    return Response.json(
      {
        error:
          "Only the comment author, this project's owner, or an organizer can remove this comment.",
      },
      { status: 403 },
    );
  }

  const deleted = await deleteProjectComment(projectId.data, commentId.data);
  if (!deleted) {
    return Response.json({ error: "Comment not found." }, { status: 404 });
  }
  revalidatePath(`/projects/${projectId.data}`);
  return new Response(null, { status: 204 });
}
