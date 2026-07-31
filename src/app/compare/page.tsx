import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { AnswerBlock, MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { COMPARISONS } from "@/content/comparisons";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  graph,
  itemListSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const TITLE = "COI Tracking Software Compared — CertShield vs Alternatives";
const DESCRIPTION =
  "Honest side-by-side comparisons of COI tracking options: myCOI, TrustLayer, Jones and spreadsheets — including when to choose the other one.";
const PATH = "/compare";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "coi tracking software comparison",
    "mycoi alternative",
    "trustlayer alternative",
    "jones alternative",
  ],
});

export default function CompareIndexPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          webPageSchema({
            title: TITLE,
            description: DESCRIPTION,
            path: PATH,
            speakableSelectors: ["[data-answer]"],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Compare", path: PATH },
          ]),
          itemListSchema(
            COMPARISONS.map((c) => ({
              name: c.h1,
              path: `/compare/${c.slug}`,
              description: c.description,
            })),
          ),
        )}
      />

      <MarketingHero
        eyebrow="Comparisons"
        title="How CertShield compares"
        subtitle="Every page here includes a section on when to buy the other product. If that costs us a customer who would have been unhappy, it was the right trade."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Compare", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6 md:py-16">
          <AnswerBlock>
            COI tracking options fall into three groups: enterprise
            vendor-compliance platforms such as myCOI, TrustLayer and Jones,
            which are quote-priced and contracted annually; SMB tools priced
            publicly per month, including CertShield at $99 to $499; and
            spreadsheets, which remain a legitimate choice below roughly 25
            vendors with a single requirement tier.
          </AnswerBlock>

          <ul className="grid gap-4 sm:grid-cols-2">
            {COMPARISONS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="border-border/80 bg-card hover:border-brand/40 group flex h-full flex-col rounded-xl border p-5 shadow-xs transition-colors"
                >
                  <h2 className="text-base font-semibold tracking-tight">
                    {c.h1}
                  </h2>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {c.description}
                  </p>
                  <span className="text-brand mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                    Read the comparison
                    <ArrowRight
                      className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              How to run the evaluation
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Take the same three difficult certificates to every vendor on your
              shortlist: one scanned or photographed, one rotated or
              poor-quality, and one with several endorsement pages attached.
              Then ask each vendor the question that separates them — what will
              you not claim? Anyone who says they can automatically detect a
              mid-term policy cancellation is telling you how they will handle
              every other edge case too.
            </p>
            <p className="text-muted-foreground text-sm">
              The longer version of that evaluation is in the{" "}
              <Link
                href="/blog/best-coi-tracking-software-buyers-guide"
                className="text-foreground font-medium underline underline-offset-2"
              >
                buyer&rsquo;s guide
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
