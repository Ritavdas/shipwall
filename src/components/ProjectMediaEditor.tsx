"use client";

import { useRef, useState } from "react";
import type { ProjectMediaInput, ProjectMediaKind } from "@/domain/media";

export type EditableMedia = ProjectMediaInput & { id: string };

type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  kind: ProjectMediaKind;
};

const FILE_ACCEPT =
  "image/avif,image/gif,image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm";

export function ProjectMediaEditor({
  media,
  setMedia,
  title,
  uploadsEnabled,
}: {
  media: EditableMedia[];
  setMedia: React.Dispatch<React.SetStateAction<EditableMedia[]>>;
  title: string;
  uploadsEnabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");

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

  async function addFiles(files: File[]) {
    if (!uploadsEnabled || uploading || files.length === 0) return;
    const available = Math.max(0, 12 - media.length);
    const selected = files.slice(0, available);
    if (selected.length === 0) {
      setUploadError("A project can include up to 12 media items.");
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index]!;
        setProgress(0);
        setUploadStatus(`Uploading ${file.name} (${index + 1} of ${selected.length})…`);
        const upload = await requestUpload(file);
        await uploadFile(file, upload.uploadUrl, setProgress);
        setMedia((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            kind: upload.kind,
            url: upload.publicUrl,
            altText: mediaTitle(file, title),
            caption: "",
          },
        ]);
      }
      setUploadStatus(
        `${selected.length} media ${selected.length === 1 ? "item" : "items"} added.`,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Media upload failed. Try again.",
      );
      setUploadStatus("");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <details
      className="rounded-xl border border-border bg-card p-4"
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files);
        if (files.length === 0) return;
        event.preventDefault();
        void addFiles(files);
      }}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        <span>Project media (optional)</span>
        <span className="shrink-0 text-xs font-normal text-muted">
          {media.length}/12
        </span>
      </summary>
      <div className="mt-2">
        <p className="text-xs leading-5 text-muted">
          Your derived screenshot is already included. Add the moments that make
          the project easy to understand.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) =>
            void addFiles(Array.from(event.target.files ?? []))
          }
        />

        <button
          type="button"
          disabled={!uploadsEnabled || uploading || media.length >= 12}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            if (!uploadsEnabled) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            if (!uploadsEnabled) return;
            event.preventDefault();
            void addFiles(Array.from(event.dataTransfer.files));
          }}
          className="mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border px-5 py-4 text-center hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-sm font-semibold">
            {uploading ? "Uploading…" : "Paste, drop, or choose media"}
          </span>
          <span className="mt-1 text-xs text-muted">
            Click here, then Ctrl+V / ⌘V · images, PDFs, or short videos
          </span>
          <span className="mt-1 text-[11px] text-muted">
            Images 8 MB · PDFs 20 MB · videos 50 MB
          </span>
        </button>

        {!uploadsEnabled ? (
          <p className="mt-2 text-xs text-amber-200">
            Direct uploads need the free Cloudflare R2 setup. Media URLs still work.
          </p>
        ) : null}

        <div
          className="mt-2 min-h-5 text-xs text-muted"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {uploading ? `${uploadStatus} ${progress}%` : uploadStatus}
        </div>
        {uploadError ? (
          <p className="mt-1 text-xs text-red-300" role="alert">
            {uploadError}
          </p>
        ) : null}

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
                      <label htmlFor={`${prefix}-kind`} className="text-xs text-muted">
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
                      <label htmlFor={`${prefix}-url`} className="text-xs text-muted">
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
                      <label htmlFor={`${prefix}-alt`} className="text-xs text-muted">
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
                      <label htmlFor={`${prefix}-caption`} className="text-xs text-muted">
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
            + Image URL
          </button>
          <button
            type="button"
            onClick={() => add("pdf")}
            disabled={media.length >= 12}
            className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
          >
            + PDF URL
          </button>
          <button
            type="button"
            onClick={() => add("video")}
            disabled={media.length >= 12}
            className="min-h-11 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-40"
          >
            + Video URL
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Video links support uploaded MP4/MOV/WebM, YouTube, Vimeo, and Loom.
        </p>
      </div>
    </details>
  );
}

async function requestUpload(file: File): Promise<PresignedUpload> {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "clipboard-upload",
      contentType: file.type,
      size: file.size,
    }),
  });
  const data = (await response.json().catch(() => null)) as
    | (PresignedUpload & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error || "Could not prepare the media upload.");
  }
  return data;
}

function uploadFile(
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () =>
      reject(new Error("The upload connection failed. Try again."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(
        new Error(
          request.status === 403
            ? "The upload was rejected. Check the R2 CORS settings."
            : "The media upload failed. Try again.",
        ),
      );
    };
    request.send(file);
  });
}

function mediaTitle(file: File, projectTitle: string) {
  const filename = (file.name || "media").replace(/\.[^.]+$/, "").trim();
  if (file.type.startsWith("image/")) {
    return `${projectTitle || "Project"} — ${filename || "image"}`;
  }
  return filename || `${projectTitle || "Project"} media`;
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
