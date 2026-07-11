import { auth } from "@/infra/auth";
import { enrichUrl } from "@/infra/enrich";

function validUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** POST { url } -> enriched, wall-ready project card (uses GitHub token if signed in). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const url = validUrl((body as { url?: unknown } | null)?.url);
  if (!url) {
    return Response.json({ error: "Enter a valid http(s) link" }, { status: 400 });
  }
  const session = await auth();
  const data = await enrichUrl(url, session?.accessToken);
  return Response.json(data);
}
