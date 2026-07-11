import { flags } from "@/infra/env";
import { isAdmin, slugify } from "@/infra/admin";
import { createEvent, listEvents, getEventBySlug } from "@/infra/store";

function noDb() {
  return Response.json(
    {
      error:
        "Organizer setup is not ready. Add DATABASE_URL, run npm run db:push, and restart ShipWall.",
    },
    { status: 503 },
  );
}

/** POST — create an event (organizer only). */
export async function POST(req: Request) {
  if (!flags.hasDb) return noDb();
  if (!isAdmin(req)) {
    return Response.json(
      {
        error:
          "Organizer token was not accepted. Enter the current ADMIN_TOKEN and save it before retrying.",
      },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    city?: string;
    eventDate?: string;
  } | null;
  if (!body?.name || !body?.city) {
    return Response.json({ error: "name and city are required." }, { status: 400 });
  }

  const rand = Math.random().toString(36).slice(2, 6);
  let slug = `${slugify(body.city)}-${slugify(body.name)}`.slice(0, 44);
  if (await getEventBySlug(slug)) slug = `${slug}-${rand}`;

  const event = await createEvent({
    slug,
    name: body.name,
    city: body.city,
    eventDate: body.eventDate ?? null,
  });
  return Response.json(event, { status: 201 });
}

/** GET — list events (organizer only). */
export async function GET(req: Request) {
  if (!flags.hasDb) return Response.json([]);
  if (!isAdmin(req)) {
    return Response.json(
      {
        error:
          "Organizer token was not accepted. Enter the current ADMIN_TOKEN and save it before retrying.",
      },
      { status: 401 },
    );
  }
  return Response.json(await listEvents());
}
