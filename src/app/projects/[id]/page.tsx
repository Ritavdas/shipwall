import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BADGES, type BadgeKind } from "@/domain/badges";
import { MediaGallery } from "@/components/MediaGallery";
import { ProjectDiscussion } from "@/components/ProjectDiscussion";
import { auth, signIn } from "@/infra/auth";
import { flags } from "@/infra/env";
import { getProjectDetail, getProjectDiscussion } from "@/infra/store";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

const ProjectId = z.string().uuid();

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!flags.hasDb || !ProjectId.safeParse(id).success) {
    return { title: "Project not found | ShipWall" };
  }

  const project = await getProjectDetail(id);
  if (!project) return { title: "Project not found | ShipWall" };

  return {
    title: `${project.title} | ShipWall`,
    description:
      project.description || `See what @${project.builder.handle} shipped.`,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  if (!flags.hasDb || !ProjectId.safeParse(id).success) notFound();

  const [project, session] = await Promise.all([getProjectDetail(id), auth()]);
  if (!project) notFound();
  const discussion = await getProjectDiscussion(id, session?.githubId);
  const viewerBuilderId = discussion.viewerBuilderId;
  const isProjectOwner = viewerBuilderId === project.ownerBuilderId;
  const signInAction = async () => {
    "use server";
    await signIn("github", { redirectTo: `/projects/${id}` });
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/e/${project.event.slug}`}
        className="inline-flex min-h-11 items-center rounded-lg pr-3 text-sm text-muted hover:text-foreground"
      >
        ← {project.event.name}
      </Link>

      <div className="mt-4 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)] lg:items-start">
        <MediaGallery title={project.title} media={project.media} />

        <article className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted">{project.event.city}</p>
              <h1 className="mt-1 break-words text-3xl font-bold leading-tight">
                {project.title}
              </h1>
            </div>
            {project.isAi ? (
              <span className="shrink-0 rounded-full bg-[#3730a3] px-3 py-1 text-xs">
                AI project
              </span>
            ) : null}
          </div>

          {project.description ? (
            <p className="mt-5 whitespace-pre-line text-base leading-7 text-muted">
              {project.description}
            </p>
          ) : null}

          {project.problem ? (
            <section className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Problem
              </h2>
              <p className="mt-2 leading-7">{project.problem}</p>
            </section>
          ) : null}

          {project.stack.length > 0 ? (
            <section className="mt-6" aria-labelledby="project-stack">
              <h2
                id="project-stack"
                className="text-sm font-semibold uppercase tracking-wide text-muted"
              >
                Built with
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {project.badges.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {project.badges.map((badge) => {
                const meta = BADGES[badge as BadgeKind];
                return meta ? (
                  <span
                    key={badge}
                    className="rounded-full bg-[#1b2340] px-3 py-1 text-xs"
                  >
                    {meta.emoji} {meta.label}
                  </span>
                ) : null;
              })}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={project.projectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-accent px-4 font-semibold text-[#0a0e1a] hover:opacity-90"
            >
              Open demo ↗
            </a>
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border px-4 font-medium hover:border-accent"
              >
                View source ↗
              </a>
            ) : null}
          </div>

          <footer className="mt-8 border-t border-border pt-5 text-sm text-muted">
            <p>
              Shipped by{" "}
              <span className="font-medium text-foreground">
                @{project.builder.handle}
              </span>
            </p>
            <p className="mt-1">
              <time dateTime={project.createdAt.toISOString()}>
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                }).format(project.createdAt)}
              </time>
              {project.needs.length > 0
                ? ` · Looking for ${project.needs.join(", ")}`
                : ""}
            </p>
          </footer>
        </article>
      </div>
      <ProjectDiscussion
        projectId={id}
        initialComments={discussion.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          author: comment.author,
          canDelete:
            isProjectOwner || viewerBuilderId === comment.builderId,
        }))}
        initialReactionCounts={discussion.reactionCounts}
        initialViewerReactions={discussion.viewerReactions}
        commentLimit={discussion.commentLimit}
        signedIn={Boolean(session?.githubId && session.login)}
        signInAction={signInAction}
      />
    </main>
  );
}
