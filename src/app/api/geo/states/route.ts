import { FALLBACK_US_STATES, normalizeStateCode } from "@/lib/geo/us-states";
import { NextResponse } from "next/server";

/**
 * US states / territories for address forms, sourced from a public dataset.
 *
 * Fetched rather than shipped as a constant so the list is real data the
 * product looks up, not a hand-maintained array that drifts. Cached for a day
 * at the edge — the underlying data is effectively static, so the upstream is
 * hit about once per deployment, not once per form.
 *
 * `FALLBACK_US_STATES` is a resilience net, never the primary source: a US
 * property manager must still be able to save an address while a third-party
 * lookup service is down. The response says which path produced the list.
 *
 * Upstream: countriesnow.space (free, no API key).
 */

const UPSTREAM =
  "https://countriesnow.space/api/v0.1/countries/states/q?country=United%20States";
const UPSTREAM_TIMEOUT_MS = 5_000;

type UpstreamState = { name?: string; state_code?: string };

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const body = (await res.json()) as {
      error?: boolean;
      data?: { states?: UpstreamState[] };
    };
    const raw = body.data?.states ?? [];

    const states = raw
      .map((s) => ({
        code: normalizeStateCode(s.state_code ?? s.name),
        name: s.name?.trim() ?? "",
      }))
      .filter((s): s is { code: string; name: string } =>
        Boolean(s.code && s.name),
      )
      .sort((a, b) => a.code.localeCompare(b.code));

    // A truncated or reshaped upstream response is worse than no upstream —
    // fall through rather than render a half-empty state picker.
    if (states.length < 50) throw new Error("upstream returned too few states");

    return NextResponse.json({ source: "upstream", states });
  } catch {
    return NextResponse.json({ source: "fallback", states: FALLBACK_US_STATES });
  }
}
