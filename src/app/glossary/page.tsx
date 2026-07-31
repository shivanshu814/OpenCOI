import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { GLOSSARY, glossaryByGroup } from "@/content/glossary";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  definedTermSetSchema,
  graph,
  webPageSchema,
} from "@/lib/seo/schema";
import Link from "next/link";

const TITLE = "COI Glossary — Certificate of Insurance Terms Defined";
const DESCRIPTION =
  "Plain definitions of certificate of insurance terminology: ACORD 25, additional insured, CG 20 10, waiver of subrogation, aggregate limits and more.";
const PATH = "/glossary";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "coi glossary",
    "certificate of insurance terms",
    "insurance endorsement definitions",
    "acord 25 terminology",
  ],
});

export default function GlossaryPage() {
  const groups = glossaryByGroup();

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
            { name: "Glossary", path: PATH },
          ]),
          definedTermSetSchema({
            name: "CertShield COI Glossary",
            description: DESCRIPTION,
            path: PATH,
            terms: GLOSSARY.map((t) => ({
              term: t.term,
              definition: t.definition,
              slug: t.slug,
            })),
          }),
        )}
      />

      <MarketingHero
        eyebrow="Reference"
        title="Certificate of insurance glossary"
        subtitle="Every term that appears on a COI or in a vendor insurance requirement, defined in one or two sentences. Written for the person checking the document."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Glossary", path: PATH },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
          <nav
            aria-label="Jump to section"
            className="flex flex-wrap gap-2 text-sm"
          >
            {groups.map((g) => (
              <a
                key={g.group}
                href={`#${g.group.toLowerCase().replace(/\s+/g, "-")}`}
                className="border-border/80 bg-card hover:border-brand/40 rounded-full border px-3 py-1.5 transition-colors"
              >
                {g.group}
              </a>
            ))}
          </nav>

          {groups.map((g) => (
            <section
              key={g.group}
              id={g.group.toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-24 space-y-4"
            >
              <h2 className="text-xl font-semibold tracking-tight">{g.group}</h2>
              <dl className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
                {g.terms.map((t) => (
                  <div key={t.slug} id={t.slug} className="scroll-mt-24 px-5 py-4">
                    <dt className="text-sm font-semibold">{t.term}</dt>
                    <dd
                      data-answer
                      className="text-muted-foreground mt-1.5 text-sm leading-relaxed"
                    >
                      {t.definition}
                      {t.readMore ? (
                        <>
                          {" "}
                          <Link
                            href={t.readMore.href}
                            className="text-brand font-medium underline-offset-2 hover:underline"
                          >
                            {t.readMore.label} →
                          </Link>
                        </>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <p className="text-muted-foreground text-sm">
            Longer explanations live on the{" "}
            <Link
              href="/blog"
              className="text-foreground font-medium underline underline-offset-2"
            >
              blog
            </Link>
            ; typical limits by trade are in the{" "}
            <Link
              href="/vendor-insurance-requirements"
              className="text-foreground font-medium underline underline-offset-2"
            >
              requirements table
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
