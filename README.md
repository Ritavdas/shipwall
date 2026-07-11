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
- **Paste-first media** — copy an image or short video, focus the media dropzone, and press `Ctrl+V` / `⌘V`. Direct uploads use Cloudflare R2; drag/drop, file selection, and HTTPS URLs remain available.
- **No-download voice entry** — supported browsers add a one-tap microphone beside the project title and description. It uses the browser speech-recognition service, so ShipWall does not ship or download a voice model.
- **Focused project feedback** — public project pages show a compact comment thread and `Support`, `Celebrate`, and `Insightful` counts. GitHub-authenticated builders can comment and react without turning the wall into a social feed.
- **Auto-badges** — First Ship, AI Builder (LLM deps detected), Full-Stack, Serial Builder — all derived, nothing self-reported.
- **City counter** — projects shipped, the exact KPI, live on the wall.
- **Needs chips** — one tap (`Compute / API credits / Design / Distribution / Mentorship`) builds the grant/credit dataset without feeling like a form.

Public GitHub repos auto-enrich from their languages and README. For private
projects, submit a live, deploy, or demo URL instead; ShipWall enriches the
**ship** (title + live screenshot via Microlink), not private source code.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Auth.js (GitHub) · Drizzle +
Neon Postgres · Cloudflare R2 · Vercel AI SDK → **OpenRouter** · `next/og` · `qrcode`.

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
- **Cloudflare R2** — _optional_. Enables paste/drop/file uploads while URL media keeps working without it. Create a public R2 bucket, an Object Read & Write API token, then set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`. R2 currently includes 10 GB storage in its free tier.
- **`ADMIN_TOKEN`** — any string; protects `/admin` + CSV export. (Blank = open in local dev.)

> The app boots with **zero** config — every feature degrades gracefully when a
> key is missing.

For browser uploads, add this CORS policy to the R2 bucket and replace the origins
with the local and deployed ShipWall URLs:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "MaxAgeSeconds": 3600
  }
]
```

Upload limits are intentionally free-tier friendly: 8 MB images, 20 MB PDFs, and
50 MB MP4/MOV/WebM videos. The upload API issues five-minute, authenticated,
content-type-bound presigned URLs; R2 credentials never reach the browser.

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

The comments/reactions layer is additive too. A schema push creates the
`project_reaction_kind` enum plus `project_comments` and `project_reactions`;
it does not rewrite existing events, builders, submissions, badges, or media.
Both interaction tables cascade when their project or builder is deleted.
`project_reactions` has a database uniqueness constraint on
`(submission_id, builder_id, kind)`, and indexed project/author foreign keys
keep reads and cascades bounded. Deploy the schema push before deploying this
application version so project pages do not query tables that are not present.

### 4. Run

```bash
npm run dev
```

- Organizer: <http://localhost:3000/admin> → create an event → print the QR.
- Builders scan the QR → `/e/<slug>/submit`.
- Live wall (project this): `/e/<slug>`.
- Export the dataset: `/api/export?event=<slug>&format=csv&token=<ADMIN_TOKEN>`.

### Project interaction API

Project pages read the latest 50 comments in deterministic chronological order
and all reaction totals directly on the server. Mutations are uncached Route
Handlers and revalidate the affected `/projects/[id]` page:

- `POST /api/projects/:id/comments` with `{ "body": "..." }` — GitHub session required; comments are whitespace-normalized plain text, limited to 1,000 characters, and rate-limited to 5 per builder per 10-minute window.
- `DELETE /api/projects/:id/comments/:commentId` — allowed for the comment author or the project owner. Organizers may instead pass the existing `x-admin-token` header; the token is checked server-side by the same `ADMIN_TOKEN` boundary used by event/export APIs.
- `PUT /api/projects/:id/reactions/:kind` and `DELETE /api/projects/:id/reactions/:kind` — idempotently add/remove `support`, `celebrate`, or `insightful` for the signed-in builder.
- `POST /api/uploads` — returns a short-lived R2 upload URL for an authenticated builder after checking file type and size.

Organizer moderation example (prefer a header so the token does not enter URL
or browser history):

```bash
curl -X DELETE \
  -H "x-admin-token: $ADMIN_TOKEN" \
  "$APP_URL/api/projects/<project-uuid>/comments/<comment-uuid>"
```

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
- `src/domain/**` — pure logic: `needs`, `badges`, `stack` (AI/full-stack detection), `enrichment`, media URL/embed normalization, and Zod interaction validation.
- `src/infra/**` — boundaries: `env` (Zod), `db` (Drizzle + Neon, including ordered media and constrained project interactions), `auth`/`identity` (Auth.js plus builder upserts), `uploads` (R2 presigning), `github` + `microlink` + `ai` enrichment, `store` (data access), `admin`.
- `src/components/**` — `SubmitForm`, `ProjectMediaEditor`, `VoiceInputButton`, `MediaGallery`, `ProjectDiscussion`, `Wall`.

Convention mirrors the taskmanagebot layout (strict TS, Zod-typed env boundary,
Vercel AI SDK → OpenRouter, `domain` / `infra` split).

## Roadmap (v2)

Cross-city streaks & levels · opt-in fine-grained GitHub
App (per-repo grant) · realtime wall (websocket instead of polling).
