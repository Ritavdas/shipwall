import { revalidatePath } from "next/cache";
import {
  projectIdSchema,
  reactionKindSchema,
} from "@/domain/interactions";
import { flags } from "@/infra/env";
import { getCurrentBuilder } from "@/infra/identity";
import {
  getProjectOwnerBuilderId,
  setProjectReaction,
} from "@/infra/store";

type ReactionRouteContext = {
  params: Promise<{ id: string; kind: string }>;
};

export async function PUT(_request: Request, context: ReactionRouteContext) {
  return updateReaction(context, true);
}

export async function DELETE(_request: Request, context: ReactionRouteContext) {
  return updateReaction(context, false);
}

async function updateReaction(
  { params }: ReactionRouteContext,
  active: boolean,
) {
  if (!flags.hasDb) {
    return Response.json(
      { error: "Reactions are unavailable because the database is not configured." },
      { status: 503 },
    );
  }

  const routeParams = await params;
  const projectId = projectIdSchema.safeParse(routeParams.id);
  const kind = reactionKindSchema.safeParse(routeParams.kind);
  if (!projectId.success || !kind.success) {
    return Response.json(
      {
        error:
          projectId.error?.issues[0]?.message ?? kind.error?.issues[0]?.message,
      },
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
      { error: "Sign in with GitHub to react to this project." },
      { status: 401 },
    );
  }

  const count = await setProjectReaction({
    submissionId: projectId.data,
    builderId: identity.builder.id,
    kind: kind.data,
    active,
  });
  revalidatePath(`/projects/${projectId.data}`);
  return Response.json({ kind: kind.data, count, active });
}
