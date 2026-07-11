import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * ShipWall schema. Kept intentionally small: identity + the project link
 * power everything, so we store what we *derive*, not what we ask.
 */

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  eventDate: text("event_date"), // ISO date string, optional
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const builders = pgTable("builders", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubId: text("github_id").notNull().unique(),
  handle: text("handle").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectMediaKind = pgEnum("project_media_kind", [
  "image",
  "pdf",
  "video",
]);

export const projectReactionKind = pgEnum("project_reaction_kind", [
  "support",
  "celebrate",
  "insightful",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    builderId: uuid("builder_id")
      .notNull()
      .references(() => builders.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    problem: text("problem"),
    projectUrl: text("project_url").notNull(),
    repoUrl: text("repo_url"),
    source: text("source").notNull().default("link"), // "github" | "link"
    stack: text("stack").array().notNull().default([]),
    needs: text("needs").array().notNull().default([]),
    screenshotUrl: text("screenshot_url"),
    isAi: boolean("is_ai").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("submissions_event_idx").on(t.eventId)],
);

export const projectMedia = pgTable(
  "project_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    kind: projectMediaKind("kind").notNull(),
    url: text("url").notNull(),
    altText: text("alt_text"),
    caption: text("caption"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("project_media_submission_position_idx").on(
      t.submissionId,
      t.position,
    ),
  ],
);

export const projectComments = pgTable(
  "project_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    builderId: uuid("builder_id")
      .notNull()
      .references(() => builders.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("project_comments_submission_created_idx").on(
      t.submissionId,
      t.createdAt,
      t.id,
    ),
    index("project_comments_builder_created_idx").on(t.builderId, t.createdAt),
    check(
      "project_comments_body_length_check",
      sql`char_length(${t.body}) between 1 and 1000`,
    ),
  ],
);

export const projectReactions = pgTable(
  "project_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    builderId: uuid("builder_id")
      .notNull()
      .references(() => builders.id, { onDelete: "cascade" }),
    kind: projectReactionKind("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("project_reactions_unique_idx").on(
      t.submissionId,
      t.builderId,
      t.kind,
    ),
    index("project_reactions_submission_kind_idx").on(t.submissionId, t.kind),
    index("project_reactions_builder_idx").on(t.builderId),
  ],
);

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  builderId: uuid("builder_id")
    .notNull()
    .references(() => builders.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").references(() => submissions.id, {
    onDelete: "cascade",
  }),
  kind: text("kind").notNull(),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type Builder = typeof builders.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type ProjectMedia = typeof projectMedia.$inferSelect;
export type ProjectComment = typeof projectComments.$inferSelect;
export type ProjectReaction = typeof projectReactions.$inferSelect;
export type Badge = typeof badges.$inferSelect;
