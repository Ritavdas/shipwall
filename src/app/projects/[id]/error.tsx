"use client";

export default function ProjectError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Could not load this project</h1>
      <p className="mt-3 text-sm text-muted">
        The project is still safe. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 min-h-11 rounded-xl bg-accent px-4 font-semibold text-[#0a0e1a]"
      >
        Try again
      </button>
    </main>
  );
}
