# ShipWall 🚀

Track what people actually build at our events. Scan a QR → sign in with GitHub
→ paste your project link. The title, stack, and description are **derived, not
typed**, then the project flips onto a live wall.

**North Star:** quality projects shipped, not attendance.

```
QR  →  GitHub sign-in  →  paste link  →  auto-enrich  →  Project page + Ship Wall
        (identity only)    (1 field)     (derive, don't ask)   (the reward)
```

## Why it's gamified with ~zero extra friction

Every game reward comes from **identity + the project link** — never a new field:

- **Ship Wall** — submit and your card flips onto the projected live wall.
- **Auto share-card** — a `/api/share/[id]` OG image ("I shipped X at [city] 🚀"), one tap to post. The reward is an _output_, not more input.
- **Durable project pages** — every wall card opens `/projects/[id]`, with clear demo/source actions and an accessible gallery for images, PDF decks, and privacy-conscious YouTube, Vimeo, or Loom embeds.
- **Auto-badges** — First Ship, AI Builder (LLM deps detected), Full-Stack, Serial Builder — all derived, nothing self-reported.
- **City counter** — projects shipped, the exact KPI, live on the wall.
- **Needs chips** — one tap (`Compute / API credits / Design / Distribution / Mentorship`) builds the grant/credit dataset without feeling like a form.

Public GitHub repos auto-enrich from their languages and README. For private
projects, submit a live, deploy, or demo URL instead; ShipWall enriches the
**ship** (title + live screenshot via Microlink), not private source code.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Auth.js (GitHub) · Drizzle +
Neon Postgres · Vercel AI SDK → **OpenRouter** · `next/og` · `qrcode`.

## Setup (≈10 min)

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Fill in `.env`

- **`DATABASE_URL`** — create a free Postgres at [neon.tech](https://neon.tech), paste the pooled connection string.
- **GitHub OAuth** — [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App:
  - Homepage: `http://localhost:3000`
  - Callback: `http://localhost:3000/api/auth/callback/github`
  - Copy Client ID/secret → `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.
- **`AUTH_SECRET`** — `openssl rand -base64 32`.
- **`OPENROUTER_API_KEY`** — _optional_. [openrouter.ai/keys](https://openrouter.ai/keys). Without it, enrichment still works (GitHub API + Microlink); the AI just refines titles/summaries.
- **`ADMIN_TOKEN`** — any string; protects `/admin` + CSV export. (Blank = open in local dev.)

> The app boots with **zero** config — every feature degrades gracefully when a
> key is missing.

### 3. Push the schema

```bash
npm run db:push
```

ShipWall currently uses Drizzle&apos;s push workflow rather than tracking generated
migrations. The project-media foundation is additive: it creates the
`project_media_kind` enum and `project_media` table without changing or removing
`submissions.screenshot_url`. Existing submissions therefore keep working; when
no ordered media rows exist, the detail page treats the legacy screenshot as the
first image. New submissions write both an ordered media list and the first image
back to `screenshot_url` for wall-card compatibility.

### 4. Run

```bash
npm run dev
```

- Organizer: <http://localhost:3000/admin> → create an event → print the QR.
- Builders scan the QR → `/e/<slug>/submit`.
- Live wall (project this): `/e/<slug>`.
- Export the dataset: `/api/export?event=<slug>&format=csv&token=<ADMIN_TOKEN>`.

## Deploy

**Fastest — Vercel:** push to GitHub, import on Vercel, set the same env vars,
add your production URL to the GitHub OAuth callback + `APP_URL`. Neon plugs in
with zero ops.

**Self-host (your own server, later):** the app ships a standalone Dockerfile.

```bash
docker build -t shipwall .
docker run -p 3000:3000 --env-file .env shipwall
```

Point `DATABASE_URL` at any Postgres (including one on your own box) — no code
change. That's the whole migration path.

## Architecture

- `src/app/**` — Next routes: pages (`/`, `/admin`, `/e/[slug]`, `/e/[slug]/submit`, `/projects/[id]`) + route handlers (`/api/*`).
- `src/domain/**` — pure logic: `needs`, `badges`, `stack` (AI/full-stack detection), `enrichment`, and media URL/embed normalization.
- `src/infra/**` — boundaries: `env` (Zod), `db` (Drizzle + Neon, including ordered `project_media` rows), `auth` (Auth.js), `github` + `microlink` + `ai` enrichment, `store` (data access), `admin`.
- `src/components/**` — `SubmitForm`, `MediaGallery`, `Wall`.

Convention mirrors the taskmanagebot layout (strict TS, Zod-typed env boundary,
Vercel AI SDK → OpenRouter, `domain` / `infra` split).

## Roadmap (v2)

Cross-city streaks & levels · reactions on cards · opt-in fine-grained GitHub
App (per-repo grant) · realtime wall (websocket instead of polling).
