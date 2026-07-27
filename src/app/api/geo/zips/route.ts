import { normalizeStateCode } from "@/lib/geo/us-states";
import { NextResponse } from "next/server";

/**
 * City + state -> ZIP suggestions.
 *
 * A city can span many ZIP codes, so this route returns options instead of
 * pretending there is always one correct answer. The form auto-fills only
 * when the result is unambiguous.
 *
 * Upstream: Zippopotam.us (free public postal data, no API key).
 */

const UPSTREAM_TIMEOUT_MS = 4_000;

type ZippopotamPlaceResponse = {
  places?: Array<{
    "place name"?: string;
    "post code"?: string;
  }>;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const state = normalizeStateCode(params.get("state"));
  const city = params.get("city")?.trim();

  if (!state || !city) {
    return NextResponse.json(
      { error: "state and city are required." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://api.zippopotam.us/us/${state}/${encodeURIComponent(city)}`,
      {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        next: { revalidate: 86_400 },
      },
    );

    if (res.status === 404) {
      return NextResponse.json({ state, city, zips: [] });
    }
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = (await res.json()) as ZippopotamPlaceResponse;
    const zips = Array.from(
      new Set(
        (body.places ?? [])
          .map((p) => p["post code"]?.trim())
          .filter((zip): zip is string => Boolean(zip)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ state, city, zips });
  } catch {
    return NextResponse.json({ state, city, zips: [] });
  }
}
