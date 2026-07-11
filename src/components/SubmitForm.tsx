"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Enrichment } from "@/domain/enrichment";
import type { ProjectMediaInput, ProjectMediaKind } from "@/domain/media";
import { NEEDS } from "@/domain/needs";

type Phase = "idle" | "enriching" | "preview" | "submitting" | "done" | "error";
type EditableMedia = ProjectMediaInput & { id: string };

export function SubmitForm({
  eventSlug,
  login,
  avatarUrl,
  appUrl,
}: {
  eventSlug: string;
  login: string;
  avatarUrl?: string | null;
  appUrl: string;
}) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [media, setMedia] = useState<EditableMedia[]>([]);
  const [resultId, setResultId] = useState<string | null>(null);

  async function handleEnrich(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setPhase("enriching");
    setError("");
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read that link");
      const enr = data as Enrichment;
      setEnrichment(enr);
      setTitle(enr.title);
      setDescription(enr.description);
      setMedia(
        enr.screenshotUrl
          ? [
              {
                id: crypto.randomUUID(),
                kind: "image",
                url: enr.screenshotUrl,
                altText: `${enr.title} project preview`,
                caption: "",
              },
            ]
          : [],
      );
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }

  async function handleSubmit() {
    if (!enrichment) return;
    setPhase("submitting");
    setError("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug,
          projectUrl: enrichment.projectUrl,
          title: title.trim() || enrichment.title,
          description: description.trim(),
          problem: problem.trim(),
          repoUrl: enrichment.repoUrl,
          screenshotUrl: enrichment.screenshotUrl,
          media: media.map(({ id: _id, ...item }) => item),
          source: enrichment.source,
          stack: enrichment.stack,
          needs,
          isAi: enrichment.isAi,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      setResultId(data.id);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("preview");
    }
  }

  function toggleNeed(n: string) {
    setNeeds((cur) =>
      cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n],
    );
  }

  if (phase === "done" && resultId) {
    return (
      <DoneCard
        id={resultId}
        title={title}
        eventSlug={eventSlug}
        appUrl={appUrl}
      />
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center gap-3 text-sm text-muted">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full border border-border"
          />
        ) : null}
        <span>
          Signed in as <span className="text-foreground">@{login}</span>
        </span>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: `/e/${eventSlug}/submit` })}
          className="ml-auto underline hover:text-foreground"
        >
          Switch
        </button>
      </div>

      {phase !== "preview" && phase !== "submitting" ? (
        <form onSubmit={handleEnrich} className="flex flex-col gap-3">
          <label className="text-sm font-medium">Paste your project link</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="github.com/you/project  or  your-demo.vercel.app"
            className="rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-accent"
          />
          <p className="text-xs text-muted">
            Public GitHub repos auto-fill from their languages and README. For a
            private project, paste its live, deploy, or demo URL instead.
          </p>
          <button
            type="submit"
            disabled={phase === "enriching"}
            className="mt-1 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-[#0a0e1a] transition hover:opacity-90 disabled:opacity-60"
          >
            {phase === "enriching" ? "Reading your project…" : "Continue →"}
          </button>
          {phase === "error" ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}
        </form>
      ) : null}

      {(phase === "preview" || phase === "submitting") && enrichment ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          {enrichment.screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={enrichment.screenshotUrl}
              alt={`${title || enrichment.title} project preview`}
              className="aspect-video w-full rounded-xl border border-border object-cover"
            />
          ) : null}

          <MediaEditor media={media} setMedia={setMedia} title={title} />

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Project</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-lg font-semibold outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">What it does</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">
              What problem does it solve? (optional)
            </label>
            <input
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="One line — who it helps and how"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {enrichment.stack.length ? (
            <div className="flex flex-wrap gap-2">
              {enrichment.stack.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted"
                >
                  {s}
                </span>
              ))}
              {enrichment.isAi ? (
                <span className="rounded-full bg-[#3730a3] px-3 py-1 text-xs">
                  🤖 AI
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted">
              What would unlock your next build? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {NEEDS.map((n) => {
                const on = needs.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNeed(n)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      on
                        ? "border-accent bg-accent text-[#0a0e1a]"
                        : "border-border bg-card text-muted hover:border-accent"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={phase === "submitting"}
            className="mt-1 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-[#0a0e1a] transition hover:opacity-90 disabled:opacity-60"
          >
            {phase === "submitting" ? "Shipping…" : "Ship it 🚀"}
          </button>
          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setEnrichment(null);
              setMedia([]);
            }}
            className="text-xs text-muted underline"
          >
            ← use a different link
          </button>
        </form>
      ) : null}
    </div>
  );
}

function MediaEditor({
  media,
  setMedia,
  title,
}: {
  media: EditableMedia[];
  setMedia: React.Dispatch<React.SetStateAction<EditableMedia[]>>;
  title: string;
}) {
  function add(kind: ProjectMediaKind) {
    if (media.length >= 12) return;
    setMedia((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        kind,
        url: "",
        altText: kind === "image" ? `${title || "Project"} image` : "",
        caption: "",
      },
    ]);
  }

  function update(id: string, patch: Partial<ProjectMediaInput>) {
    setMedia((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function move(index: number, delta: -1 | 1) {
    setMedia((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  return (
    <details className="rounded-xl border border-border bg-card p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        <span>Project media (optional)</span>
        <span className="shrink-0 text-xs font-normal text-muted">
          {media.length}/12
        </span>
      </summary>
      <div className="mt-2">
        <p className="text-xs leading-5 text-muted">
          Your derived screenshot is already included. Add a deck or video only
          if it helps tell the story.
        </p>

        {media.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
            No media selected. The project can still be published.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
          {media.map((item, index) => {
            const prefix = `media-${item.id}`;
            return (
              <fieldset
                key={item.id}
                className="min-w-0 rounded-lg border border-border p-3"
              >
                <legend className="px-1 text-xs font-medium text-muted">
                  {index + 1}. {mediaKindLabel(item.kind)}
                </legend>

                <div className="grid min-w-0 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <div>
                    <label
                      htmlFor={`${prefix}-kind`}
                      className="text-xs text-muted"
                    >
                      Type
                    </label>
                    <select
                      id={`${prefix}-kind`}
                      value={item.kind}
                      onChange={(event) => {
                        const kind = event.target.value as ProjectMediaKind;
                        update(item.id, {
                          kind,
                          altText:
                            kind === "image" && !item.altText
                              ? `${title || "Project"} image`
                              : item.altText,
                        });
                      }}
                      className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      <option value="image">Image</option>
                      <option value="pdf">PDF deck</option>
                      <option value="video">Video</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`${prefix}-url`}
                      className="text-xs text-muted"
                    >
                      HTTPS URL
                    </label>
                    <input
                      id={`${prefix}-url`}
                      type="url"
                      required
                      value={item.url}
                      onChange={(event) =>
                        update(item.id, { url: event.target.value })
                      }
                      placeholder={mediaUrlPlaceholder(item.kind)}
                      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label
                      htmlFor={`${prefix}-alt`}
                      className="text-xs text-muted"
                    >
                      {item.kind === "image"
                        ? "Image description"
                        : "Accessible title (optional)"}
                    </label>
                    <input
                      id={`${prefix}-alt`}
                      required={item.kind === "image"}
                      value={item.altText}
                      onChange={(event) =>
                        update(item.id, { altText: event.target.value })
                      }
                      placeholder={
                        item.kind === "image"
                          ? "Describe what the image shows"
                          : "Name this media"
                      }
                      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor={`${prefix}-caption`}
                      className="text-xs text-muted"
                    >
                      Caption (optional)
                    </label>
                    <input
                      id={`${prefix}-caption`}
                      value={item.caption}
                      onChange={(event) =>
                        update(item.id, { caption: event.target.value })
                      }
                      placeholder="Add context for viewers"
                      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === media.length - 1}
                    className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMedia((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      )
                    }
                    className="min-h-11 rounded-lg border border-border px-3 text-xs text-red-300 hover:border-red-300"
                  >
                    Remove
                  </button>
                </div>
              </fieldset>
            );
          })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => add("image")}
            disabled={media.length >= 12}
            className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
          >
            + Image
          </button>
          <button
            type="button"
            onClick={() => add("pdf")}
            disabled={media.length >= 12}
            className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
          >
            + PDF deck
          </button>
          <button
            type="button"
            onClick={() => add("video")}
            disabled={media.length >= 12}
            className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
          >
            + Video
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Video embeds support YouTube, Vimeo, and Loom.
        </p>
      </div>
    </details>
  );
}

function mediaKindLabel(kind: ProjectMediaKind) {
  if (kind === "pdf") return "PDF deck";
  return kind[0]!.toUpperCase() + kind.slice(1);
}

function mediaUrlPlaceholder(kind: ProjectMediaKind) {
  if (kind === "video") return "https://youtube.com/watch?v=…";
  if (kind === "pdf") return "https://example.com/deck.pdf";
  return "https://example.com/screenshot.png";
}

function DoneCard({
  id,
  title,
  eventSlug,
  appUrl,
}: {
  id: string;
  title: string;
  eventSlug: string;
  appUrl: string;
}) {
  const projectPath = `/projects/${id}`;
  const projectUrl = `${appUrl.replace(/\/$/, "")}${projectPath}`;
  const tweet = `I shipped ${title} 🚀`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweet,
  )}&url=${encodeURIComponent(projectUrl)}`;

  return (
    <div className="w-full max-w-md pop-in text-center">
      <div className="mb-4 text-5xl">🚀</div>
      <h2 className="text-2xl font-bold">You&apos;re on the wall!</h2>
      <p className="mt-2 text-sm text-muted">
        {title} just shipped. Share it — that&apos;s free reach for you and us.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/share/${id}`}
        alt="Your share card"
        className="mt-6 w-full rounded-xl border border-border"
      />

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={projectPath}
          className="rounded-xl border border-border px-4 py-3 font-medium hover:border-accent"
        >
          View your project →
        </Link>
        <Link
          href={`/e/${eventSlug}`}
          className="rounded-xl border border-border px-4 py-3 font-medium hover:border-accent"
        >
          See the Ship Wall
        </Link>
        <a
          href={xUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-[#0a0e1a] hover:opacity-90"
        >
          Post to X
        </a>
      </div>
    </div>
  );
}
