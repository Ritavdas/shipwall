import { z } from "zod";

export const REACTION_KINDS = [
  "support",
  "celebrate",
  "insightful",
] as const;

export type ReactionKind = (typeof REACTION_KINDS)[number];

export const REACTIONS: Record<
  ReactionKind,
  { label: string; activeLabel: string }
> = {
  support: { label: "Support", activeLabel: "Remove support" },
  celebrate: { label: "Celebrate", activeLabel: "Remove celebration" },
  insightful: { label: "Insightful", activeLabel: "Remove insightful reaction" },
};

export const projectIdSchema = z.uuid({
  error: "Project ID must be a valid UUID.",
});

export const commentIdSchema = z.uuid({
  error: "Comment ID must be a valid UUID.",
});

export const reactionKindSchema = z.enum(REACTION_KINDS, {
  error: "Reaction must be support, celebrate, or insightful.",
});

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const commentBodySchema = z
  .string({ error: "Comment body must be text." })
  .max(5000, { error: "Comment is too long. Use 1,000 characters or fewer." })
  .transform(normalizeWhitespace)
  .pipe(
    z
      .string()
      .min(1, { error: "Write a comment before submitting." })
      .max(1000, {
        error: "Comment is too long. Use 1,000 characters or fewer.",
      }),
  );

export const createCommentSchema = z.object({
  body: commentBodySchema,
});
