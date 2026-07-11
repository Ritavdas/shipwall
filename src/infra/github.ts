import type { RawEnrichment } from "@/domain/enrichment";
import { detectAI } from "@/domain/stack";

const GH_API = "https://api.github.com";

export function parseGitHubUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("github.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ShipWall",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * Read languages and README from public repositories. Reuse a signed-in
 * builder's token when available, but do not request private-repository access.
 */
export async function enrichGitHub(
  url: string,
  token?: string,
): Promise<RawEnrichment> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) return { projectUrl: url, source: "link" };
  const { owner, repo } = parsed;
  const base = `${GH_API}/repos/${owner}/${repo}`;

  const [repoRes, langRes, readmeRes] = await Promise.allSettled([
    fetch(base, { headers: headers(token) }),
    fetch(`${base}/languages`, { headers: headers(token) }),
    fetch(`${base}/readme`, {
      headers: { ...headers(token), Accept: "application/vnd.github.raw+json" },
    }),
  ]);

  let description: string | undefined;
  let homepage: string | undefined;
  let topics: string[] = [];
  let title = repo;
  if (repoRes.status === "fulfilled" && repoRes.value.ok) {
    const data = (await repoRes.value.json()) as {
      name?: string;
      description?: string;
      homepage?: string;
      topics?: string[];
    };
    title = data.name || repo;
    description = data.description ?? undefined;
    homepage = data.homepage || undefined;
    topics = data.topics ?? [];
  }

  let stack: string[] = [];
  if (langRes.status === "fulfilled" && langRes.value.ok) {
    stack = Object.keys((await langRes.value.json()) as Record<string, number>);
  }

  let readme: string | undefined;
  if (readmeRes.status === "fulfilled" && readmeRes.value.ok) {
    readme = (await readmeRes.value.text()).slice(0, 4000);
  }

  if (!description && readme) {
    // First non-heading, non-empty line of the README as a fallback blurb.
    description = readme
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && !l.startsWith("!["))
      ?.slice(0, 200);
  }

  return {
    title,
    description,
    stack,
    topics,
    readme,
    repoUrl: `https://github.com/${owner}/${repo}`,
    projectUrl: homepage || `https://github.com/${owner}/${repo}`,
    source: "github",
    isAi: detectAI([...stack, ...topics, description, readme]),
  };
}
