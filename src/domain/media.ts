import { z } from "zod";

export const PROJECT_MEDIA_KINDS = ["image", "pdf", "video"] as const;
export type ProjectMediaKind = (typeof PROJECT_MEDIA_KINDS)[number];

export const webUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
    );
  }, "Use a public http(s) URL without embedded credentials.");

export const mediaUrlSchema = webUrlSchema.refine(
  (value) => new URL(value).protocol === "https:",
  "Media URLs must use HTTPS.",
);

export const projectMediaInputSchema = z
  .object({
    kind: z.enum(PROJECT_MEDIA_KINDS),
    url: mediaUrlSchema,
    altText: z.string().trim().max(180).optional().default(""),
    caption: z.string().trim().max(280).optional().default(""),
  })
  .superRefine((media, context) => {
    if (media.kind === "image" && media.altText.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["altText"],
        message: "Images need meaningful alternative text.",
      });
    }

    if (
      media.kind === "video" &&
      !getVideoEmbed(media.url) &&
      !isDirectVideoUrl(media.url)
    ) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: "Use an uploaded MP4, MOV, WebM, or a YouTube, Vimeo, or Loom URL.",
      });
    }
  });

export type ProjectMediaInput = z.infer<typeof projectMediaInputSchema>;

export type VideoEmbed = {
  provider: "YouTube" | "Vimeo" | "Loom";
  canonicalUrl: string;
  embedUrl: string;
};

export function normalizeProjectMedia(
  input: ProjectMediaInput,
): ProjectMediaInput {
  if (input.kind !== "video") return input;

  const video = getVideoEmbed(input.url);
  if (!video && !isDirectVideoUrl(input.url)) {
    throw new Error("Unsupported video URL.");
  }

  return video ? { ...input, url: video.canonicalUrl } : input;
}

export function isDirectVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /\.(?:m4v|mov|mp4|webm)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function getVideoEmbed(value: string): VideoEmbed | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be" || host.endsWith(".youtube.com") || host === "youtube.com") {
    const id =
      host === "youtu.be"
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") ??
          videoPathId(url.pathname, ["embed", "shorts", "live"]);
    if (!validVideoId(id, /^[a-zA-Z0-9_-]{6,20}$/)) return null;
    return {
      provider: "YouTube",
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  }

  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
    const segments = url.pathname.split("/").filter(Boolean);
    const idIndex = segments.findIndex((segment) => /^\d{6,12}$/.test(segment));
    const id = idIndex >= 0 ? segments[idIndex] : null;
    if (!id) return null;
    const possibleHash = url.searchParams.get("h") ?? segments[idIndex + 1];
    const hash =
      possibleHash && /^[a-zA-Z0-9]{6,64}$/.test(possibleHash)
        ? possibleHash
        : null;
    return {
      provider: "Vimeo",
      canonicalUrl: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1${
        hash ? `&h=${hash}` : ""
      }`,
    };
  }

  if (host === "loom.com" || host.endsWith(".loom.com")) {
    const id = videoPathId(url.pathname, ["share", "embed"]);
    if (!validVideoId(id, /^[a-zA-Z0-9]{16,64}$/)) return null;
    return {
      provider: "Loom",
      canonicalUrl: `https://www.loom.com/share/${id}`,
      embedUrl: `https://www.loom.com/embed/${id}`,
    };
  }

  return null;
}

function videoPathId(pathname: string, prefixes: string[]): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2 || !prefixes.includes(segments[0]!)) return null;
  return segments[1] ?? null;
}

function validVideoId(
  value: string | null | undefined,
  pattern: RegExp,
): value is string {
  return Boolean(value && pattern.test(value));
}
