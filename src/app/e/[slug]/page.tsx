import { notFound } from "next/navigation";
import Link from "next/link";
import { flags } from "@/infra/env";
import { getEventBySlug, listSubmissionCards } from "@/infra/store";
import { Wall } from "@/components/Wall";

export default async function EventWallPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!flags.hasDb) {
    return (
      <SetupNotice message="No database configured yet. Add DATABASE_URL to .env and create an event from /admin." />
    );
  }

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const cards = await listSubmissionCards(event.id);

  return (
    <Wall
      slug={event.slug}
      eventName={event.name}
      city={event.city}
      initial={cards}
    />
  );
}

function SetupNotice({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-6 text-center">
      <div className="text-4xl">🧱</div>
      <p className="text-muted">{message}</p>
      <Link href="/admin" className="text-accent underline">
        Go to organizer setup
      </Link>
    </main>
  );
}
