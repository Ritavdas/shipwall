import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">
        Project not found
      </p>
      <h1 className="mt-2 text-3xl font-bold">This ship is not on the wall.</h1>
      <p className="mt-3 text-muted">
        The project may have been removed, or the link may be incomplete.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 hover:border-accent"
      >
        Back to ShipWall
      </Link>
    </main>
  );
}
