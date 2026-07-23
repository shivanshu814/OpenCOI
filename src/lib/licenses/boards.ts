/** A3 — state board lookup links (manual verify; no scraping in W5). */

const BOARD_URLS: Record<string, string> = {
  CA: "https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx",
  FL: "https://www.myfloridalicense.com/wl11.asp",
  TX: "https://www.tdlr.texas.gov/LicenseSearch/",
  NY: "https://www.dos.ny.gov/licensing/",
  IL: "https://idfpr.illinois.gov/LicenseLookUp/",
};

export function boardLookupUrl(state: string | null | undefined): string | null {
  if (!state) return null;
  const st = state.trim().toUpperCase().slice(0, 2);
  return BOARD_URLS[st] ?? null;
}

export const LICENSE_BOARD_STATES = Object.keys(BOARD_URLS);
