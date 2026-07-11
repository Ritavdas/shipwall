import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env, flags } from "@/infra/env";
import * as schema from "./schema";

/**
 * Neon serverless Postgres via Drizzle. Portable: point DATABASE_URL at any
 * Postgres (including a self-hosted box) later with no code change.
 *
 * `db` is null when DATABASE_URL is unset so the app still boots; callers use
 * `requireDb()` at the point they actually need persistence.
 */
export const db = flags.hasDb
  ? drizzle(neon(env.DATABASE_URL!), { schema })
  : null;

export function requireDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon (or any Postgres) connection string to .env",
    );
  }
  return db;
}

export { schema };
