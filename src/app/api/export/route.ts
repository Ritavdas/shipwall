import { flags } from "@/infra/env";
import { isAdmin } from "@/infra/admin";
import { getEventBySlug, listSubmissionCards } from "@/infra/store";

function csvCell(v: unknown): string {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * GET ?event=slug&format=csv|json — the grant-pitch dataset:
 * how many projects, what they are, stacks, and what builders need next.
 */
export async function GET(req: Request) {
  if (!flags.hasDb) {
    return Response.json({ error: "No database configured." }, { status: 503 });
  }
  if (!isAdmin(req)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const params = new URL(req.url).searchParams;
  const slug = params.get("event");
  const format = params.get("format") ?? "json";
  if (!slug) {
    return Response.json({ error: "Missing event." }, { status: 400 });
  }
  const event = await getEventBySlug(slug);
  if (!event) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }
  const cards = await listSubmissionCards(event.id);

  if (format === "csv") {
    const header = [
      "title",
      "builder",
      "description",
      "problem",
      "project_url",
      "repo_url",
      "source",
      "stack",
      "needs",
      "is_ai",
      "badges",
      "created_at",
    ];
    const lines = [header.join(",")];
    for (const c of cards) {
      lines.push(
        [
          csvCell(c.title),
          csvCell(c.builder.handle),
          csvCell(c.description),
          csvCell(c.problem),
          csvCell(c.projectUrl),
          csvCell(c.repoUrl),
          csvCell(c.source),
          csvCell(c.stack),
          csvCell(c.needs),
          csvCell(c.isAi),
          csvCell(c.badges),
          csvCell(c.createdAt.toISOString()),
        ].join(","),
      );
    }
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shipwall-${slug}.csv"`,
      },
    });
  }

  return Response.json({
    event: { slug: event.slug, name: event.name, city: event.city },
    count: cards.length,
    projects: cards,
  });
}
