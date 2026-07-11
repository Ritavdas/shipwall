import { ImageResponse } from "next/og";
import { flags } from "@/infra/env";
import { getShareCard } from "@/infra/store";

export const dynamic = "force-dynamic";

/**
 * Auto-generated share card: "I shipped [project] at [city] 🚀".
 * The reward is an OUTPUT, not more input — one tap to post, free reach.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let title = "a project";
  let handle = "";
  let city = "our meetup";
  let stack: string[] = [];
  let isAi = false;

  if (flags.hasDb) {
    try {
      const card = await getShareCard(id);
      if (card) {
        title = card.title;
        handle = card.handle;
        city = card.city;
        stack = card.stack.slice(0, 4);
        isAi = card.isAi;
      }
    } catch {
      // fall through to defaults
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b1020 0%, #131a34 100%)",
          padding: "64px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34 }}>
          <span style={{ fontSize: 44, marginRight: 14 }}>🚀</span>
          <span style={{ color: "#8ea2ff", fontWeight: 700 }}>ShipWall</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#9fb0d0", marginBottom: 12 }}>
            {handle ? `@${handle} shipped` : "Shipped"}
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            {title.slice(0, 60)}
          </div>
          <div style={{ fontSize: 34, color: "#c7d2fe", marginTop: 18 }}>
            at {city}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", fontSize: 26 }}>
          {isAi ? (
            <span
              style={{
                background: "#3730a3",
                borderRadius: 999,
                padding: "8px 20px",
                marginRight: 16,
              }}
            >
              🤖 AI Builder
            </span>
          ) : null}
          <span style={{ color: "#7f8ec9" }}>{stack.join("  ·  ")}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
