import { isValidZip, normalizeStateCode } from "@/lib/geo/us-states";
import { NextResponse } from "next/server";

/**
 * ZIP → city/state lookup for address forms.
 *
 * Proxied through our own route rather than called from the browser so that:
 *  - the upstream can be swapped (or replaced by a bundled dataset) without
 *    touching any form,
 *  - responses are cached at the edge instead of re-fetched per keystroke,
 *  - a slow or down upstream degrades to "type it yourself" instead of
 *    hanging the form.
 *
 * Only the five-digit ZIP leaves our infrastructure — no org, vendor, or user
 * identifier — so this carries no customer data to a third party.
 *
 * Upstream: Zippopotam.us (free public postal data, no API key).
 */

const UPSTREAM_TIMEOUT_MS = 4_000;

type ZippopotamResponse = {
  "post code"?: string;
  places?: Array<{
    "place name"?: string;
    state?: string;
    "state abbreviation"?: string;
  }>;
};

export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get("zip")?.trim() ?? "";

  if (!isValidZip(zip)) {
    return NextResponse.json(
      { error: "Enter a 5-digit US ZIP code." },
      { status: 400 },
    );
  }

  // ZIP+4 shares the base five digits for city/state purposes.
  const base = zip.slice(0, 5);

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${base}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      // Postal boundaries are effectively static; a day of caching keeps this
      // off the critical path for everyone after the first lookup.
      next: { revalidate: 86_400 },
    });

    if (res.status === 404) {
      return NextResponse.json(
        { found: false, error: "No US city found for that ZIP." },
        { status: 404 },
      );
    }
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const data = (await res.json()) as ZippopotamResponse;
    const place = data.places?.[0];
    const city = place?.["place name"]?.trim();
    const state =
      normalizeStateCode(place?.["state abbreviation"]) ??
      normalizeStateCode(place?.state);

    if (!city || !state) {
      return NextResponse.json(
        { found: false, error: "No US city found for that ZIP." },
        { status: 404 },
      );
    }

    return NextResponse.json({ found: true, zip: base, city, state });
  } catch {
    // Never block the form on a third party — the fields stay editable.
    return NextResponse.json(
      {
        found: false,
        error: "Address lookup is unavailable right now — enter city and state manually.",
      },
      { status: 503 },
    );
  }
}
