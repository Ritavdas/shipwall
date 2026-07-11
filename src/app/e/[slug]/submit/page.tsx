import Link from "next/link";
import { auth, signIn } from "@/infra/auth";
import { flags } from "@/infra/env";
import { getEventBySlug } from "@/infra/store";
import { SubmitForm } from "@/components/SubmitForm";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = flags.hasDb ? await getEventBySlug(slug) : null;
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <Link href={`/e/${slug}`} className="text-sm text-accent">
          {event ? event.name : "ShipWall"}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Ship your project 🚀</h1>
        {event ? (
          <p className="text-sm text-muted">{event.city}</p>
        ) : null}
      </div>

      {!flags.hasAuth ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
          GitHub sign-in isn&apos;t configured yet. Add AUTH_GITHUB_ID,
          AUTH_GITHUB_SECRET and AUTH_SECRET to <code>.env</code>.
        </p>
      ) : !session?.login ? (
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: `/e/${slug}/submit` });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent px-4 py-3 text-base font-semibold text-[#0a0e1a] hover:opacity-90"
          >
            <GitHubMark />
            Sign in with GitHub
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            GitHub grants identity and email only. Public repos can auto-fill
            from their languages &amp; README.
          </p>
        </form>
      ) : (
        <SubmitForm
          eventSlug={slug}
          login={session.login}
          avatarUrl={session.avatarUrl}
        />
      )}
    </main>
  );
}

function GitHubMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
