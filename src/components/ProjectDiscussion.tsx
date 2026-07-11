"use client";

import Image from "next/image";
import { useState } from "react";
import {
  REACTIONS,
  REACTION_KINDS,
  type ReactionKind,
} from "@/domain/interactions";

type DiscussionComment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    handle: string;
    name: string | null;
    avatarUrl: string | null;
  };
  canDelete: boolean;
};

export function ProjectDiscussion({
  projectId,
  initialComments,
  initialReactionCounts,
  initialViewerReactions,
  commentLimit,
  signedIn,
  signInAction,
}: {
  projectId: string;
  initialComments: DiscussionComment[];
  initialReactionCounts: Record<ReactionKind, number>;
  initialViewerReactions: ReactionKind[];
  commentLimit: number;
  signedIn: boolean;
  signInAction: () => Promise<void>;
}) {
  const [comments, setComments] = useState(initialComments);
  const [reactionCounts, setReactionCounts] = useState(initialReactionCounts);
  const [viewerReactions, setViewerReactions] = useState(
    initialViewerReactions,
  );
  const [body, setBody] = useState("");
  const [commentPending, setCommentPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reactionPending, setReactionPending] =
    useState<ReactionKind | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentPending(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        comment?: DiscussionComment;
      } | null;
      if (!response.ok || !data?.comment) {
        throw new Error(data?.error ?? "Could not add the comment. Try again.");
      }
      setComments((current) => [...current, data.comment!].slice(-commentLimit));
      setBody("");
      setStatus("Comment added.");
    } catch (caught) {
      setError(actionableError(caught, "Could not add the comment. Try again."));
    } finally {
      setCommentPending(false);
    }
  }

  async function toggleReaction(kind: ReactionKind) {
    const active = viewerReactions.includes(kind);
    setReactionPending(kind);
    setError("");
    setStatus("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/reactions/${kind}`,
        { method: active ? "DELETE" : "PUT" },
      );
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        count?: number;
        active?: boolean;
      } | null;
      if (!response.ok || typeof data?.count !== "number") {
        throw new Error(
          data?.error ?? "Could not update the reaction. Try again.",
        );
      }
      setReactionCounts((current) => ({ ...current, [kind]: data.count! }));
      setViewerReactions((current) =>
        data.active
          ? current.includes(kind)
            ? current
            : [...current, kind]
          : current.filter((item) => item !== kind),
      );
      setStatus(`${REACTIONS[kind].label} ${data.active ? "added" : "removed"}.`);
    } catch (caught) {
      setError(
        actionableError(caught, "Could not update the reaction. Try again."),
      );
    } finally {
      setReactionPending(null);
    }
  }

  async function deleteComment(comment: DiscussionComment) {
    const confirmed = window.confirm(
      "Delete this comment? It will be removed permanently and cannot be restored.",
    );
    if (!confirmed) return;

    setDeletingId(comment.id);
    setError("");
    setStatus("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/comments/${comment.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not delete the comment. Try again.");
      }
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setStatus("Comment deleted.");
    } catch (caught) {
      setError(
        actionableError(caught, "Could not delete the comment. Try again."),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className="mx-auto mt-8 w-full max-w-4xl rounded-2xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="project-discussion-heading"
    >
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="project-discussion-heading" className="text-xl font-semibold">
            Project feedback
          </h2>
          <p className="mt-1 text-sm text-muted">
            Support the build or leave a focused comment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Project reactions">
          {REACTION_KINDS.map((kind) => {
            const active = viewerReactions.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                aria-label={`${active ? REACTIONS[kind].activeLabel : REACTIONS[kind].label}, ${reactionCounts[kind]} total`}
                disabled={!signedIn || reactionPending !== null}
                onClick={() => void toggleReaction(kind)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "border-accent bg-accent text-[#0a0e1a]"
                    : "border-border bg-background text-muted hover:border-accent hover:text-foreground"
                }`}
              >
                <span>{REACTIONS[kind].label}</span>
                <span aria-hidden="true">{reactionCounts[kind]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!signedIn ? (
        <form action={signInAction} className="border-b border-border py-5">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#0a0e1a] hover:opacity-90"
          >
            Sign in with GitHub to comment or react
          </button>
        </form>
      ) : (
        <form onSubmit={submitComment} className="border-b border-border py-5">
          <label htmlFor="project-comment" className="text-sm font-medium">
            Add a comment
          </label>
          <textarea
            id="project-comment"
            required
            maxLength={1000}
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={commentPending}
            placeholder="What stood out, or what could help this project next?"
            className="mt-2 block w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">{body.length}/1,000</span>
            <button
              type="submit"
              disabled={commentPending || body.trim().length === 0}
              className="min-h-10 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0a0e1a] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commentPending ? "Adding..." : "Add comment"}
            </button>
          </div>
        </form>
      )}

      <div aria-live="polite" aria-atomic="true" className="min-h-6 pt-3 text-sm">
        {error ? (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        ) : (
          <p className="text-muted">{status}</p>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No comments yet. Keep the first one useful and kind.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {comments.map((comment) => (
            <li key={comment.id} className="min-w-0 py-5">
              <article className="flex min-w-0 gap-3">
                {comment.author.avatarUrl ? (
                  <Image
                    src={comment.author.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full border border-border"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold"
                  >
                    {comment.author.handle.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <header className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="max-w-full truncate text-sm font-medium">
                      {comment.author.name || `@${comment.author.handle}`}
                    </span>
                    {comment.author.name ? (
                      <span className="max-w-full truncate text-xs text-muted">
                        @{comment.author.handle}
                      </span>
                    ) : null}
                    <time
                      dateTime={comment.createdAt}
                      title={new Date(comment.createdAt).toISOString()}
                      className="text-xs text-muted"
                    >
                      {formatCommentDate(comment.createdAt)}
                    </time>
                  </header>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                    {comment.body}
                  </p>
                  {comment.canDelete ? (
                    <button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() => void deleteComment(comment)}
                      className="mt-2 min-h-8 rounded-md text-xs text-muted underline decoration-border underline-offset-4 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === comment.id ? "Deleting..." : "Delete comment"}
                    </button>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
      {comments.length >= commentLimit ? (
        <p className="border-t border-border pt-4 text-xs text-muted">
          Showing the latest {commentLimit} comments.
        </p>
      ) : null}
    </section>
  );
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function actionableError(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return "Could not reach ShipWall. Check your connection and try again.";
  }
  return error instanceof Error ? error.message : fallback;
}
