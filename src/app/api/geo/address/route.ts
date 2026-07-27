import { normalizeStateCode } from "@/lib/geo/us-states";
import { NextResponse } from "next/server";

/**
 * US street-address suggestions.
 *
 * This is suggestion-only: the user can always type an address manually. The
 * request carries just the typed address text and optional city/state context;
 * no org, vendor, or account identifier leaves CertShield.
 *
 * Upstream: US Census Geocoder (free public address-range data, no API key).
 */

const UPSTREAM_TIMEOUT_MS = 5_000;
const MAX_SUGGESTIONS = 5;

type CensusMatch = {
  matchedAddress?: string;
  addressComponents?: {
    zip?: string;
    city?: string;
    state?: string;
    fromAddress?: string;
    streetName?: string;
    suffixType?: string;
    preDirection?: string;
    preType?: string;
    suffixDirection?: string;
  };
};

type CensusResponse = {
  result?: {
    addressMatches?: CensusMatch[];
  };
};

function titleCase(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .trim();
}

function streetLine(c: CensusMatch["addressComponents"]): string {
  return [
    c?.fromAddress,
    c?.preDirection,
    c?.preType,
    c?.streetName,
    c?.suffixType,
    c?.suffixDirection,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const state = normalizeStateCode(params.get("state"));
  const city = params.get("city")?.trim() ?? "";

  if (q.length < 4) {
    return NextResponse.json({ suggestions: [] });
  }

  const query = [q, city, state].filter(Boolean).join(", ");

  try {
    const upstream = new URL(
      "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
    );
    upstream.searchParams.set("address", query);
    upstream.searchParams.set("benchmark", "Public_AR_Current");
    upstream.searchParams.set("format", "json");

    const res = await fetch(upstream, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = (await res.json()) as CensusResponse;
    const seen = new Set<string>();
    const suggestions = (body.result?.addressMatches ?? [])
      .map((match) => {
        const c = match.addressComponents;
        const line = titleCase(streetLine(c));
        const city = titleCase(c?.city);
        const state = normalizeStateCode(c?.state) ?? "";
        const postalCode = c?.zip?.trim() ?? "";
        const suggestion = {
          label: [line, city, state ? `${state} ${postalCode}` : postalCode]
            .filter(Boolean)
            .join(", "),
          address_line: line,
          city,
          state,
          postal_code: postalCode,
        };
        return suggestion.address_line &&
          suggestion.city &&
          suggestion.state &&
          suggestion.postal_code
          ? suggestion
          : null;
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .filter((s) => {
        const key = `${s.address_line}|${s.city}|${s.state}|${s.postal_code}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_SUGGESTIONS);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
