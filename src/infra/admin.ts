import { env } from "@/infra/env";

/**
 * MVP organizer auth: a shared bearer token. If ADMIN_TOKEN is unset (local
 * dev), access is open for convenience. Set it before deploying.
 */
export function isAdmin(req: Request): boolean {
  const token = env.ADMIN_TOKEN;
  if (!token) return true;
  const provided =
    req.headers.get("x-admin-token") ??
    new URL(req.url).searchParams.get("token");
  return provided === token;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
