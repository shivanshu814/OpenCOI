import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { ORG } from "@/lib/seo/site";

/**
 * `/og?title=…&eyebrow=…` — the social card behind every page's OG tag.
 *
 * A route rather than a per-page `opengraph-image.tsx` file because there are
 * ~30 indexable pages and they all want the same card with different text; one
 * renderer beats thirty near-identical files.
 *
 * Colours are hex, not the app's oklch tokens, on purpose: the renderer behind
 * `ImageResponse` (Satori) supports a subset of CSS and does not parse oklch —
 * it would silently fall back to transparent and ship a blank card. These are
 * the hex approximations of the brand ink and accent.
 */

const INK = "#182b45";
const INK_DEEP = "#0e1c30";
const BRAND = "#34d399";

export const contentType = "image/png";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawTitle = searchParams.get("title")?.trim();
  const title =
    rawTitle && rawTitle.length > 0
      ? rawTitle.slice(0, 110)
      : "Never work with an uninsured vendor again.";
  const eyebrow =
    searchParams.get("eyebrow")?.trim().slice(0, 48) ||
    "COI tracking for property managers & contractors";

  // Long headlines need to step down or they wrap into five lines and overflow.
  const fontSize = title.length > 78 ? 52 : title.length > 52 ? 60 : 70;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px",
          backgroundColor: INK,
          backgroundImage: `linear-gradient(135deg, ${INK} 0%, ${INK_DEEP} 100%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: BRAND,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {ORG.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: BRAND,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: "flex",
              fontSize,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.025em",
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div style={{ display: "flex" }}>
            AI reads every certificate. A person checks every verdict.
          </div>
          <div style={{ display: "flex" }}>From ${ORG.priceLow}/mo</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cards are pure functions of the query string — cache them hard at the
        // edge so a viral post does not re-render the same PNG a thousand times.
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
