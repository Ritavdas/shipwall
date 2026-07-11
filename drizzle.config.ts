import type { Config } from "drizzle-kit";

// Node 22 native .env loader so `drizzle-kit push` sees DATABASE_URL.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file yet — fine
}

export default {
  schema: "./src/infra/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
