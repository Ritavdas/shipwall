import type { Enrichment } from "@/domain/enrichment";
import { normalizeStack } from "@/domain/stack";
import { parseGitHubUrl, enrichGitHub } from "@/infra/github";
import { enrichLink } from "@/infra/microlink";
import { refineWithAI } from "@/infra/ai";

/**
 * The "derive, don't ask" pipeline. Give it a link (+ optional GitHub token)
 * and it returns a complete, wall-ready project card. Never throws — every
 * branch has a sane fallback so a submission is never blocked.
 */
export async function enrichUrl(
  url: string,
  githubToken?: string,
): Promise<Enrichment> {
  const isGitHub = Boolean(parseGitHubUrl(url));
  const raw = isGitHub
    ? await enrichGitHub(url, githubToken)
    : await enrichLink(url);

  const refined = await refineWithAI(raw);

  const title = (refined?.title || raw.title || hostName(url)).trim();
  const description = (refined?.description || raw.description || "").trim();
  const stack = normalizeStack(
    refined?.stack?.length ? refined.stack : (raw.stack ?? []),
  );
  const isAi = refined?.isAi ?? raw.isAi ?? false;

  return {
    title,
    description,
    stack,
    projectUrl: raw.projectUrl || url,
    repoUrl: raw.repoUrl,
    screenshotUrl: raw.screenshotUrl,
    source: raw.source ?? (isGitHub ? "github" : "link"),
    isAi,
  };
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Project";
  }
}
