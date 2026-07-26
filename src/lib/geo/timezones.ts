/**
 * Time zones read from the runtime's own IANA database.
 *
 * `Intl.supportedValuesOf("timeZone")` returns the ~400 zones ICU actually
 * ships, and `Intl.DateTimeFormat` gives each one its current abbreviation and
 * UTC offset — including the DST shift on the day you ask. That is real,
 * self-updating data: no hand-written list to go stale when a jurisdiction
 * changes its rules, and no third-party call to fail.
 */

export type TimezoneOption = {
  /** IANA identifier, e.g. "America/New_York" — what gets stored. */
  value: string;
  /** e.g. "New York — EST (UTC−05:00)" */
  label: string;
  /** Minutes east of UTC right now; used for ordering. */
  offsetMinutes: number;
};

/**
 * US zones, in the order a US customer expects to see them.
 *
 * The IANA list has no "is this in the United States" flag, so the country
 * scoping is explicit. CertShield sells to US property managers and stores
 * data in a US region (spec §0), so this is the set that matters; the helper
 * below still accepts any zone the runtime knows if one is already stored.
 */
const US_ZONE_IDS = [
  "America/New_York",
  "America/Detroit",
  "America/Indiana/Indianapolis",
  "America/Kentucky/Louisville",
  "America/Chicago",
  "America/Menominee",
  "America/Denver",
  "America/Boise",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Juneau",
  "America/Nome",
  "Pacific/Honolulu",
  "America/Adak",
  "America/Puerto_Rico",
  "America/St_Thomas",
  "Pacific/Guam",
  "Pacific/Saipan",
  "Pacific/Pago_Pago",
] as const;

function supportedZones(): string[] {
  try {
    // Older runtimes lack supportedValuesOf; the curated US list still works.
    const fn = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    return typeof fn === "function" ? fn.call(Intl, "timeZone") : [];
  } catch {
    return [];
  }
}

/** Current abbreviation ("EST") and UTC offset for a zone, from the runtime. */
function describeZone(
  zone: string,
  now: Date,
): { abbreviation: string; offsetMinutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(now);
    const abbreviation =
      parts.find((p) => p.type === "timeZoneName")?.value ?? "";

    // Offset is derived by formatting the same instant in the zone and in UTC
    // and diffing — Intl exposes no direct offset accessor.
    const asUtc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const asZone = new Date(now.toLocaleString("en-US", { timeZone: zone }));
    const offsetMinutes = Math.round(
      (asZone.getTime() - asUtc.getTime()) / 60_000,
    );

    return { abbreviation, offsetMinutes };
  } catch {
    return null;
  }
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${h}:${m}`;
}

/** Human city name from an IANA id: "America/New_York" → "New York". */
export function zoneCityName(zone: string): string {
  const last = zone.split("/").pop() ?? zone;
  return last.replaceAll("_", " ");
}

/**
 * Selectable time zones, US first and offset-ordered.
 *
 * @param include an already-stored zone to keep selectable even if it is not
 *   in the US set (e.g. a customer who set it before relocating).
 */
export function usTimezoneOptions(
  include?: string | null,
  now: Date = new Date(),
): TimezoneOption[] {
  const supported = new Set(supportedZones());
  const wanted = new Set<string>(
    US_ZONE_IDS.filter((z) => supported.size === 0 || supported.has(z)),
  );
  if (include && (supported.size === 0 || supported.has(include))) {
    wanted.add(include);
  }

  return [...wanted]
    .map((zone) => {
      const info = describeZone(zone, now);
      if (!info) return null;
      return {
        value: zone,
        label: `${zoneCityName(zone)} — ${info.abbreviation} (${formatOffset(info.offsetMinutes)})`,
        offsetMinutes: info.offsetMinutes,
      };
    })
    .filter((o): o is TimezoneOption => o !== null)
    .sort(
      (a, b) =>
        b.offsetMinutes - a.offsetMinutes || a.label.localeCompare(b.label),
    );
}

/** The zone the viewer's own machine reports, when we can read it. */
export function detectTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
