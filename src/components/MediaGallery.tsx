"use client";

import Image, { type ImageLoader } from "next/image";
import { useState } from "react";
import { getVideoEmbed } from "@/domain/media";
import type { ProjectMediaItem } from "@/infra/store";

const passthroughLoader: ImageLoader = ({ src }) => src;

export function MediaGallery({
  title,
  media,
}: {
  title: string;
  media: ProjectMediaItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex];

  if (!active) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 text-center text-sm text-muted">
        This project does not have media yet. Use the demo and source links to
        explore it.
      </div>
    );
  }

  function select(index: number) {
    setActiveIndex((index + media.length) % media.length);
  }

  return (
    <section
      aria-label={`${title} media gallery`}
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          select(activeIndex - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          select(activeIndex + 1);
        }
      }}
      className="min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <MediaFrame media={active} title={title} />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {activeIndex + 1} of {media.length}
          <span className="sr-only">: {active.kind}</span>
        </p>
        {media.length > 1 ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => select(activeIndex - 1)}
              aria-label="Show previous media"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-card text-lg hover:border-accent"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => select(activeIndex + 1)}
              aria-label="Show next media"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-card text-lg hover:border-accent"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      {media.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Choose project media">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => select(index)}
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`Show ${item.kind} ${index + 1}`}
              className={`min-h-11 rounded-lg border px-3 text-xs font-medium capitalize ${
                index === activeIndex
                  ? "border-accent bg-accent text-[#0a0e1a]"
                  : "border-border bg-card text-muted hover:border-accent"
              }`}
            >
              {item.kind} {index + 1}
            </button>
          ))}
        </div>
      ) : null}

      <p className="sr-only">
        Use the left and right arrow keys while the gallery is focused to move
        between media.
      </p>
    </section>
  );
}

function MediaFrame({
  media,
  title,
}: {
  media: ProjectMediaItem;
  title: string;
}) {
  if (media.kind === "image") {
    return (
      <figure>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-card">
          <Image
            loader={passthroughLoader}
            unoptimized
            src={media.url}
            alt={media.altText || `${title} project media`}
            fill
            sizes="(max-width: 1024px) 100vw, 800px"
            className="object-contain"
          />
        </div>
        {media.caption ? (
          <figcaption className="mt-2 text-sm text-muted">
            {media.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (media.kind === "pdf") {
    return (
      <figure>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <iframe
            src={media.url}
            title={media.altText || `${title} document`}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox=""
            className="h-[65vh] min-h-96 w-full bg-white"
          />
        </div>
        <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>{media.caption || "Project deck or document"}</span>
          <span className="flex flex-wrap gap-2">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-foreground hover:border-accent"
            >
              Open PDF
            </a>
            <a
              href={media.url}
              download
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-foreground hover:border-accent"
            >
              Download
            </a>
          </span>
        </figcaption>
      </figure>
    );
  }

  const video = getVideoEmbed(media.url);
  if (!video) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted">
          This video provider is no longer supported for embedding.
        </p>
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-border px-3 hover:border-accent"
        >
          Open video
        </a>
      </div>
    );
  }

  return (
    <figure>
      <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
        <iframe
          src={video.embedUrl}
          title={media.altText || `${title} video on ${video.provider}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
      <figcaption className="mt-2 text-sm text-muted">
        {media.caption || `${video.provider} video`}
      </figcaption>
    </figure>
  );
}
