import type { RawEnrichment } from "@/domain/enrichment";

/**
 * Fallback enrichment for anything that isn't a readable GitHub repo:
 * GitLab, deploy URLs, no-code tools, private-elsewhere. We gamify the SHIP,
 * not the source — so grab title/description + a screenshot of the live thing.
 */
export async function enrichLink(url: string): Promise<RawEnrichment> {
  try {
    const api = `https://api.microlink.io?url=${encodeURIComponent(
      url,
    )}&screenshot=true&meta=true`;
    const res = await fetch(api, { headers: { "User-Agent": "ShipWall" } });
    if (!res.ok) return fallback(url);
    const json = (await res.json()) as {
      status?: string;
      data?: {
        title?: string;
        description?: string;
        image?: { url?: string };
        logo?: { url?: string };
        screenshot?: { url?: string };
      };
    };
    const d = json.data ?? {};
    return {
      title: d.title || hostTitle(url),
      description: d.description ?? undefined,
      stack: [],
      screenshotUrl: d.screenshot?.url || d.image?.url || undefined,
      projectUrl: url,
      source: "link",
      isAi: false,
    };
  } catch {
    return fallback(url);
  }
}

function fallback(url: string): RawEnrichment {
  return {
    title: hostTitle(url),
    stack: [],
    projectUrl: url,
    source: "link",
    isAi: false,
  };
}

function hostTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Project";
  }
}
