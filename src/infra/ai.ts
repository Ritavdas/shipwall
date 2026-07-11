import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { env, flags } from "@/infra/env";
import type { RawEnrichment } from "@/domain/enrichment";

const RefineSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  stack: z.array(z.string()).max(6),
  isAi: z.boolean(),
});

/**
 * OpenRouter (via the Vercel AI SDK, same wiring as taskmanagebot) turns messy
 * repo/link metadata into a crisp title + one-line "what it does" + clean stack
 * tags. Optional: returns null when no key is set so enrichment still works.
 */
export async function refineWithAI(
  raw: RawEnrichment,
): Promise<z.infer<typeof RefineSchema> | null> {
  if (!flags.hasAI) return null;
  try {
    const client = createOpenAI({
      baseURL: env.OPENROUTER_BASE_URL,
      apiKey: env.OPENROUTER_API_KEY!,
    });
    const model = client(env.OPENROUTER_MODEL);

    const { object } = await generateObject({
      model,
      schema: RefineSchema,
      prompt: [
        "You are cleaning up a hackathon project submission for a public wall.",
        "Given the raw metadata below, produce:",
        "- title: the project name, human-friendly (no owner prefix).",
        "- description: ONE sentence on what it does / the problem it solves.",
        "- stack: up to 6 concise technology tags (languages/frameworks).",
        "- isAi: true if it uses AI/LLMs/ML in any meaningful way.",
        "",
        `Raw title: ${raw.title ?? ""}`,
        `Raw description: ${raw.description ?? ""}`,
        `Detected languages/stack: ${(raw.stack ?? []).join(", ")}`,
        `Topics: ${(raw.topics ?? []).join(", ")}`,
        `README (truncated):\n${(raw.readme ?? "").slice(0, 2500)}`,
      ].join("\n"),
    });
    return object;
  } catch {
    return null;
  }
}
