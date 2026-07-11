"use client";

import { useEffect, useState } from "react";
import { BADGES, type BadgeKind } from "@/domain/badges";

export type WallCard = {
  id: string;
  title: string;
  description: string | null;
  problem: string | null;
  projectUrl: string;
  repoUrl: string | null;
  source: string;
  stack: string[];
  needs: string[];
  screenshotUrl: string | null;
  isAi: boolean;
  builder: { handle: string; name: string | null; avatarUrl: string | null };
  badges: string[];
};

export function Wall({
  slug,
  eventName,
  city,
  initial,
}: {
  slug: string;
  eventName: string;
  city: string;
  initial: WallCard[];
}) {
  const [cards, setCards] = useState<WallCard[]>(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/submissions?event=${slug}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.submissions)) setCards(data.submissions);
      } catch {
        // ignore transient errors, keep last good state
      }
    };
    const iv = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [slug]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted">{city}</div>
          <h1 className="text-3xl font-bold">{eventName}</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-4xl font-extrabold text-accent tabular-nums">
              {cards.length}
            </div>
            <div className="text-xs uppercase tracking-wide text-muted">
              projects shipped
            </div>
          </div>
          <a
            href={`/e/${slug}/submit`}
            className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-[#0a0e1a] hover:opacity-90"
          >
            + Ship yours
          </a>
        </div>
      </header>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-24 text-center text-muted">
          No ships yet. Scan the QR and be the first 🚀
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ProjectCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ card }: { card: WallCard }) {
  return (
    <a
      href={card.projectUrl}
      target="_blank"
      rel="noreferrer"
      className="pop-in flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-accent"
    >
      {card.screenshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.screenshotUrl}
          alt=""
          className="aspect-video w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight">{card.title}</h3>
          {card.isAi ? (
            <span className="shrink-0 rounded-full bg-[#3730a3] px-2 py-0.5 text-xs">
              🤖 AI
            </span>
          ) : null}
        </div>

        {card.description ? (
          <p className="line-clamp-2 text-sm text-muted">{card.description}</p>
        ) : null}

        {card.stack.length ? (
          <div className="flex flex-wrap gap-1.5">
            {card.stack.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}

        {card.badges.length ? (
          <div className="flex flex-wrap gap-1.5">
            {card.badges.map((b) => {
              const meta = BADGES[b as BadgeKind];
              if (!meta) return null;
              return (
                <span
                  key={b}
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{ background: "#1b2340" }}
                >
                  {meta.emoji} {meta.label}
                </span>
              );
            })}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted">
          {card.builder.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.builder.avatarUrl}
              alt=""
              className="h-5 w-5 rounded-full"
            />
          ) : null}
          <span>@{card.builder.handle}</span>
          {card.needs.length ? (
            <span className="ml-auto truncate text-[11px]">
              needs: {card.needs.join(", ")}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}
