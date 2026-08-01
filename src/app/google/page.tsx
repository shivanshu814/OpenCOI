import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/schema";
import { ORG } from "@/lib/seo/site";
import Link from "next/link";

/**
 * Dedicated Application home page for Google Cloud OAuth brand verification.
 *
 * Why this exists separately from `/`: Google's `evaluateBrandCompliance`
 * crawler has repeatedly returned HOMEPAGE_HAS_SUFFICIENT_CONTENT +
 * APP_NAME_CONSISTENT against the marketing homepage even when "CertShield"
 * is in the h1 and the page is thousands of words long. The same twin
 * failure mode is widely reported when Cloudflare Bot Fight Mode challenges
 * Google's verifier IP — and when the consent-screen homepage URL points at
 * a heavy JS marketing surface.
 *
 * This route is deliberately plain SSR HTML: exact app-name h1, purpose
 * copy, how Google user data is used, and Privacy/Terms links. Point the
 * OAuth consent screen "Application home page" at this URL.
 */
const PATH = "/google";
const TITLE = "CertShield — Google sign-in";
const DESCRIPTION =
  "CertShield is vendor insurance compliance software. Sign in with Google to access your workspace. How CertShield uses Google account data.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
});

export default function GoogleOAuthHomePage() {
  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          webPageSchema({
            title: TITLE,
            description: DESCRIPTION,
            path: PATH,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Google sign-in", path: PATH },
          ]),
        )}
      />

      <main className={`${SURFACE_BG}`}>
        <article className="mx-auto max-w-2xl space-y-8 px-4 py-14 sm:px-6 md:py-20">
          {/* Exact consent-screen app name — character-for-character. */}
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            CertShield
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed">
            CertShield is vendor insurance compliance software for US property
            managers and contractors. Its AI reads certificates of insurance
            (ACORD forms), verifies coverage limits, additional-insured
            endorsements, and expiration dates against each company&apos;s
            requirements, then automatically chases vendors and their insurance
            agents for renewals by email in English and Spanish. Every verdict
            is human-reviewed before publishing.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              What CertShield does
            </h2>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-base leading-relaxed">
              <li>
                Read vendor certificates of insurance (COIs) and flag expired
                or insufficient coverage
              </li>
              <li>
                Check additional-insured endorsements and related forms against
                your written requirements
              </li>
              <li>
                Chase renewals by email so vendors and their agents send a new
                certificate before coverage lapses
              </li>
              <li>
                Keep an audit trail of documents, checks, and messages for
                owners, lenders, and insurers
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              How CertShield uses Google user data
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              CertShield offers optional &quot;Sign in with Google&quot; so
              workspace users can authenticate without a magic-link email.
              When you choose Google sign-in, we receive your Google account
              email address and basic profile name solely to create or look up
              your CertShield account and keep you signed in. We do not read
              your Gmail, Drive, Calendar, or Contacts. We do not use Google
              user data for advertising, and we do not sell it. You can revoke
              access at any time in your Google Account permissions.
            </p>
            <p className="text-muted-foreground text-base leading-relaxed">
              CertShield&apos;s use of information received from Google APIs
              adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-foreground font-medium underline underline-offset-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              Privacy and terms
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Full details of what we collect and how long we keep it:{" "}
              <Link
                href="/privacy"
                className="text-foreground font-medium underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              . Product terms:{" "}
              <Link
                href="/terms"
                className="text-foreground font-medium underline underline-offset-2"
              >
                Terms of Service
              </Link>
              . Support:{" "}
              <a
                href={`mailto:${ORG.email}`}
                className="text-foreground font-medium underline underline-offset-2"
              >
                {ORG.email}
              </a>
              .
            </p>
          </section>

          <p className="text-muted-foreground text-sm leading-relaxed">
            <Link
              href="/"
              className="text-foreground font-medium underline underline-offset-2"
            >
              Back to the CertShield homepage
            </Link>{" "}
            ·{" "}
            <Link
              href="/login"
              className="text-foreground font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </article>
      </main>
    </MarketingShell>
  );
}
