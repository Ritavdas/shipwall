"use client";

/* Legit client-only init: reads localStorage on mount and fetches events.
   This rule targets synchronous cascading renders, which don't apply here. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  eventDate: string | null;
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("shipwall_admin") ?? "");
    setOrigin(window.location.origin);
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/events", {
      headers: { "x-admin-token": token },
    });
    if (!res.ok) {
      setError("Could not load events (check your organizer token).");
      return;
    }
    const data = (await res.json()) as EventRow[];
    setEvents(data);
    const origin = window.location.origin;
    const entries = await Promise.all(
      data.map(async (e) => {
        const url = `${origin}/e/${e.slug}/submit`;
        return [e.slug, await QRCode.toDataURL(url, { margin: 1, width: 240 })] as const;
      }),
    );
    setQr(Object.fromEntries(entries));
  }, [token]);

  useEffect(() => {
    if (ready && token) void load();
  }, [ready, token, load]);

  function saveToken() {
    localStorage.setItem("shipwall_admin", token);
    void load();
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ name, city, eventDate: eventDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setName("");
      setCity("");
      setEventDate("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Organizer</h1>
      <p className="mt-1 text-sm text-muted">
        Create an event, print the QR, project the wall, export the data.
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <label className="text-sm font-medium">Organizer token</label>
        <div className="mt-2 flex gap-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="value of ADMIN_TOKEN (blank = open in local dev)"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={saveToken}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0a0e1a]"
          >
            Save
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">New event</h2>
        <form onSubmit={createEvent} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Event name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted outline-none focus:border-accent"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0a0e1a] disabled:opacity-60 sm:col-span-3"
          >
            {busy ? "Creating…" : "Create event"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="mt-6 flex flex-col gap-4">
        {events.map((e) => {
          const submitUrl = `${origin}/e/${e.slug}/submit`;
          const wallUrl = `${origin}/e/${e.slug}`;
          const tokenQ = token ? `&token=${encodeURIComponent(token)}` : "";
          return (
            <div
              key={e.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row"
            >
              {qr[e.slug] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr[e.slug]}
                  alt={`QR for ${e.name}`}
                  className="h-32 w-32 rounded-lg bg-white p-1"
                />
              ) : null}
              <div className="flex flex-1 flex-col">
                <div className="text-lg font-semibold">{e.name}</div>
                <div className="text-sm text-muted">
                  {e.city}
                  {e.eventDate ? ` · ${e.eventDate}` : ""}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <a href={submitUrl} className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">
                    Submit link
                  </a>
                  <a href={wallUrl} className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">
                    Ship Wall
                  </a>
                  <a
                    href={`/api/export?event=${e.slug}&format=csv${tokenQ}`}
                    className="rounded-lg border border-border px-3 py-1.5 hover:border-accent"
                  >
                    Export CSV
                  </a>
                  <a
                    href={`/api/export?event=${e.slug}&format=json${tokenQ}`}
                    className="rounded-lg border border-border px-3 py-1.5 hover:border-accent"
                  >
                    Export JSON
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
