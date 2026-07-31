import { JsonLd } from "@/components/json-ld";
import { SURFACE_BG } from "@/components/ink-atmosphere";
import { MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { posts, postsByCategory } from "@/content/blog";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  breadcrumbSchema,
  graph,
  itemListSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const TITLE = "COI & Vendor Compliance Guides — CertShield Blog";
const DESCRIPTION =
  "Plain-English guides on certificates of insurance, ACORD forms, endorsements, and vendor risk for property managers and contractors.";

// Title/description verbatim from docs/02-BRANDING_SEO.md §3.
export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/blog",
});

const CATEGORY_BLURB: Record<string, string> = {
  Definitions:
    "What the words on a certificate actually mean — the terms that decide whether you are covered.",
  Guides: "How to run the process end to end, from collection to renewal.",
  Benchmarks: "What other people require, so you can sanity-check your own list.",
  Templates: "Things to download and use today.",
};

export default function BlogIndexPage() {
  const groups = postsByCategory();

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: "/blog" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
          itemListSchema(
            posts.map((p) => ({
              name: p.h1,
              path: `/blog/${p.slug}`,
              description: p.description,
            })),
          ),
        )}
      />

      <MarketingHero
        eyebrow="Field guides"
        title="Certificates of insurance, explained properly"
        subtitle="Everything here is written for the person who has to check the certificate, not for an insurance professional. No gated PDFs, no lead-capture walls."
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]}
        wide
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 md:py-16">
          {groups.map((group) => (
            <section key={group.category} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {group.category}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {CATEGORY_BLURB[group.category]}
                </p>
              </div>

              <ul className="grid gap-4 md:grid-cols-2">
                {group.posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="border-border/80 bg-card hover:border-brand/40 group flex h-full flex-col rounded-xl border p-5 shadow-xs transition-colors"
                    >
                      <h3 className="text-base font-semibold tracking-tight text-balance">
                        {post.h1}
                      </h3>
                      <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                        {post.description}
                      </p>
                      <span className="text-brand mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                        Read
                        <ArrowRight
                          className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                          strokeWidth={2.25}
                          aria-hidden
                        />
                        <span className="text-muted-foreground font-normal">
                          · {post.readingMinutes} min
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="text-muted-foreground text-sm">
            Prefer definitions in one place? See the{" "}
            <Link
              href="/glossary"
              className="text-foreground font-medium underline underline-offset-2"
            >
              COI glossary
            </Link>
            . Subscribe by{" "}
            <Link
              href="/blog/rss.xml"
              className="text-foreground font-medium underline underline-offset-2"
            >
              RSS
            </Link>
            .
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
