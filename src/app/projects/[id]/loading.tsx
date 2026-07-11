export default function ProjectLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading project"
      className="mx-auto w-full max-w-6xl animate-pulse px-5 py-8 sm:px-6 sm:py-12"
    >
      <div className="h-11 w-40 rounded-lg bg-card" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <div className="aspect-video rounded-2xl bg-card" />
        <div className="h-96 rounded-2xl bg-card" />
      </div>
    </main>
  );
}
