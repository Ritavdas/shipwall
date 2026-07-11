import { auth } from "@/infra/auth";
import { upsertBuilder } from "@/infra/store";

export async function getCurrentBuilder() {
  const session = await auth();
  if (!session?.githubId || !session.login) return null;

  const builder = await upsertBuilder({
    githubId: session.githubId,
    handle: session.login,
    name: session.displayName ?? null,
    avatarUrl: session.avatarUrl ?? null,
  });
  return { builder, session };
}
