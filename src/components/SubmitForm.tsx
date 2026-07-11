"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { Enrichment } from "@/domain/enrichment";
import { NEEDS } from "@/domain/needs";

type Phase = "idle" | "enriching" | "preview" | "submitting" | "done" | "error";

export function SubmitForm({
  eventSlug,
  login,
  avatarUrl,
}: {
  eventSlug: string;
  login: string;
  avatarUrl?: string | null;
}) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
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
      setPhase("error");
    }
  }

  function toggleNeed(n: string) {
    setNeeds((cur) =>
      cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n],
    );
  }

  if (phase === "done" && resultId) {
    return <DoneCard id={resultId} title={title} eventSlug={eventSlug} />;
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
        <div className="flex flex-col gap-4">
          {enrichment.screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={enrichment.screenshotUrl}
              alt=""
              className="aspect-video w-full rounded-xl border border-border object-cover"
            />
          ) : null}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Project</label>
            <input
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
            onClick={handleSubmit}
            disabled={phase === "submitting"}
            className="mt-1 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-[#0a0e1a] transition hover:opacity-90 disabled:opacity-60"
          >
            {phase === "submitting" ? "Shipping…" : "Ship it 🚀"}
          </button>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="text-xs text-muted underline"
          >
            ← use a different link
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DoneCard({
  id,
  title,
  eventSlug,
}: {
  id: string;
  title: string;
  eventSlug: string;
}) {
  const [origin, setOrigin] = useState("");
  if (typeof window !== "undefined" && !origin) setOrigin(window.location.origin);
  const wallUrl = `${origin}/e/${eventSlug}`;
  const tweet = `I shipped ${title} 🚀`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweet,
  )}&url=${encodeURIComponent(wallUrl)}`;

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
        <a
          href={xUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-[#0a0e1a] hover:opacity-90"
        >
          Post to X
        </a>
        <a
          href={wallUrl}
          className="rounded-xl border border-border px-4 py-3 font-medium hover:border-accent"
        >
          See the Ship Wall →
        </a>
      </div>
    </div>
  );
}
