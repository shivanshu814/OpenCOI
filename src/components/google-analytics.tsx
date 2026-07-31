import Script from "next/script";

/**
 * GA4, loaded on marketing surfaces only.
 *
 * Why this is not in the root layout: the root layout also wraps `/portal`,
 * `/sign` and `/confirm`, whose URLs contain a one-time magic-link token that
 * identifies a specific vendor or agent. gtag's automatic `page_view` sends
 * `page_location` — the full URL — to Google, so mounting GA globally would
 * ship live vendor tokens to a third party on every portal visit. It is
 * mounted from `MarketingShell` instead, which never renders a token surface.
 *
 * Renders nothing when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset, so local dev
 * and preview builds stay out of the property's data.
 *
 * Consent Mode v2 defaults are declared BEFORE the config call, which is the
 * only ordering Google honours. Advertising storage is denied everywhere (we
 * run no ads); analytics storage is denied by default in the EEA/UK and
 * granted elsewhere. That keeps the US funnel — the market we actually sell
 * to, docs/00 — measurable without dropping a cookie on an EU visitor who has
 * not been asked. If a consent banner is ever added, it calls
 * `gtag('consent', 'update', …)` and this default becomes the pre-answer state.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

/** EEA + UK + CH — the regions where a default-granted analytics cookie is not defensible. */
const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        id="ga4-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted',
  wait_for_update: 500
});
gtag('consent', 'default', {
  region: ${JSON.stringify(CONSENT_REGIONS)},
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});
gtag('config', ${JSON.stringify(GA_ID)}, { anonymize_ip: true });
        `.trim()}
      </Script>
    </>
  );
}
