import { z } from "zod";

/**
 * Zod-parsed environment. Every credential is optional so the app boots
 * with zero config — features degrade gracefully when keys are missing.
 * Mirrors the taskmanagebot convention of a single typed env boundary.
 */
const schema = z.object({
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-3.5-haiku"),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  APP_URL: z.string().default("http://localhost:3000"),
  ADMIN_TOKEN: z.string().optional(),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
});

/** Capability flags so callers can degrade gracefully instead of crashing. */
export const flags = {
  hasDb: Boolean(env.DATABASE_URL),
  hasAuth: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
  hasAI: Boolean(env.OPENROUTER_API_KEY),
} as const;
