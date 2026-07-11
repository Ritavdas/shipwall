import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-6 py-16">
      <div className="mb-3 flex items-center gap-2 text-accent">
        <span className="text-2xl">🚀</span>
        <span className="text-lg font-bold">ShipWall</span>
      </div>
      <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
        Track what people actually build at our events.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Scan a QR, sign in with GitHub, paste your project link. We auto-fill the
        title, stack, and description — then it flips onto the live wall. North
        Star: quality projects shipped, not attendance.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded-xl bg-accent px-5 py-3 font-semibold text-[#0a0e1a] hover:opacity-90"
        >
          Organizer → create an event
        </Link>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["10-second submit", "Sign in, paste link. Stack + summary are derived, not typed."],
          ["Public repos auto-fill", "Private project? Submit its live, deploy, or demo URL instead."],
          ["Grant-ready data", "Count, stacks, and what builders need next — exportable per city."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <div className="font-semibold">{t}</div>
            <div className="mt-1 text-sm text-muted">{d}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
