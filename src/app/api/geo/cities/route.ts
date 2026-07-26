import { stateName } from "@/lib/geo/us-states";
import { NextResponse } from "next/server";

/**
 * Cities within a US state, for type-ahead on address forms.
 *
 * The list is genuinely large (Pennsylvania alone returns ~1,050 entries), so
 * it is fetched per state and cached for a day rather than bundled. City is
 * never *restricted* to this list — a certificate can name a township or a
 * newly incorporated borough that no dataset carries yet, and refusing it
 * would block a legitimate address. The list is a suggestion set.
 *
 * Upstream: countriesnow.space (free, no API key).
 */

const UPSTREAM_TIMEOUT_MS = 6_000;

export async function GET(request: Request) {
  const stateParam = new URL(request.url).searchParams.get("state")?.trim();
  if (!stateParam) {
    return NextResponse.json(
      { error: "state is required (two-letter code)." },
      { status: 400 },
    );
  }

  // Upstream keys on the full state name, not the postal code.
  const full = stateName(stateParam) ?? stateParam;

  try {
    const res = await fetch(
      `https://countriesnow.space/api/v0.1/countries/state/cities/q?country=United%20States&state=${encodeURIComponent(full)}`,
      {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        next: { revalidate: 86_400 },
      },
    );
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = (await res.json()) as { data?: unknown };
    const cities = Array.isArray(body.data)
      ? body.data.filter((c): c is string => typeof c === "string" && !!c.trim())
      : [];

    return NextResponse.json({ state: stateParam, cities });
  } catch {
    // Suggestions are optional — the city field stays free text either way.
    return NextResponse.json({ state: stateParam, cities: [] });
  }
}
