import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { AnswerBlock, MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { COMPARISONS, getComparison } from "@/content/comparisons";
import { ogImageUrl, pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  faqPageSchema,
  graph,
  webPageSchema,
} from "@/lib/seo/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};

  return pageMetadata({
    title: c.title,
    description: c.description,
    path: `/compare/${c.slug}`,
    keywords: c.keywords,
    images: [ogImageUrl(c.h1, "Honest comparison")],
  });
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const path = `/compare/${c.slug}`;
  const others = COMPARISONS.filter((x) => x.slug !== c.slug);

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          webPageSchema({
            title: c.title,
            description: c.description,
            path,
            speakableSelectors: ["[data-answer]"],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Compare", path: "/compare" },
            { name: c.h1, path },
          ]),
          faqPageSchema(c.faq),
        )}
      />

      <MarketingHero
        eyebrow="Comparison"
        title={c.h1}
        subtitle={`Written to be useful even if you end up choosing ${c.competitor}. Nothing below states ${c.competitor === "a spreadsheet" ? "a" : "their"} price as fact — verify commercial details directly with the vendor.`}
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 md:py-16">
          <div className="max-w-3xl">
            <AnswerBlock>{c.answer}</AnswerBlock>
          </div>

          <section className="max-w-3xl space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What {c.competitor} is
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {c.positioning}
            </p>
          </section>

          <section className="max-w-3xl space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              What {c.competitor} does better
            </h2>
            <ul className="text-muted-foreground marker:text-brand list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {c.credit.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Side by side
            </h2>
            <div className="border-border/80 bg-card overflow-x-auto rounded-xl border shadow-xs">
              <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border/80 border-b">
                    <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">
                      Dimension
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold tracking-wide uppercase">
                      {c.competitor}
                    </th>
                    <th scope="col" className="text-brand px-4 py-3 text-xs font-semibold tracking-wide uppercase">
                      CertShield
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {c.rows.map((row) => (
                    <tr key={row.dimension}>
                      <th scope="row" className="px-4 py-3 text-left align-top font-medium">
                        {row.dimension}
                      </th>
                      <td className="text-muted-foreground px-4 py-3 align-top leading-relaxed">
                        {row.them}
                      </td>
                      <td className="px-4 py-3 align-top leading-relaxed">
                        {row.us}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="border-border/80 bg-card space-y-3 rounded-xl border p-5 shadow-xs">
              <h2 className="text-base font-semibold">
                Choose {c.competitor} when
              </h2>
              <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {c.whenThem.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="border-brand/30 bg-brand/[0.06] space-y-3 rounded-xl border p-5">
              <h2 className="text-base font-semibold">Choose CertShield when</h2>
              <ul className="text-muted-foreground marker:text-brand list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {c.whenUs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="max-w-3xl space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Frequently asked
            </h2>
            <dl className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
              {c.faq.map((item) => (
                <div key={item.q} className="px-5 py-4">
                  <dt className="text-sm font-semibold">{item.q}</dt>
                  <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="max-w-3xl space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              Other comparisons
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/compare/${o.slug}`}
                    className="border-border/80 bg-card hover:border-brand/40 inline-flex rounded-full border px-3 py-1.5 transition-colors"
                  >
                    vs {o.competitor}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-brand/30 bg-brand/[0.06] max-w-3xl space-y-2 rounded-xl border p-6">
            <h2 className="text-base font-semibold">
              The fastest way to compare is on your own certificates
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Send the same three difficult certificates to every vendor on your
              shortlist — a scan, a rotated page, and one with endorsement pages
              attached — and compare the output. Ours is free and needs no call.
            </p>
            <Link
              href="/free-audit"
              className="text-brand inline-flex text-sm font-semibold underline-offset-4 hover:underline"
            >
              Get the free 3-certificate audit →
            </Link>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
