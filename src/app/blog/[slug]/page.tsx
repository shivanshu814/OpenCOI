import { SURFACE_BG } from "@/components/ink-atmosphere";
import { JsonLd } from "@/components/json-ld";
import { AnswerBlock, MarketingHero } from "@/components/marketing-hero";
import { MarketingShell } from "@/components/marketing-shell";
import { ProseBlocks, h2Headings } from "@/components/prose-blocks";
import { getPost, posts } from "@/content/blog";
import { pageMetadata, ogImageUrl } from "@/lib/seo/metadata";
import {
  articleSchema,
  breadcrumbSchema,
  faqPageSchema,
  graph,
  webPageSchema,
} from "@/lib/seo/schema";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/** Every post is known at build time — prerender all of them, no runtime misses. */
export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.published,
    modifiedTime: post.updated ?? post.published,
    keywords: post.keywords,
    images: [ogImageUrl(post.h1, post.category)],
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const path = `/blog/${post.slug}`;
  const headings = h2Headings(post.body);
  const related = post.related
    .map((s) => getPost(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          articleSchema({
            title: post.h1,
            description: post.description,
            path,
            published: post.published,
            updated: post.updated,
            keywords: post.keywords,
          }),
          webPageSchema({
            title: post.title,
            description: post.description,
            path,
            // Points the answer engines at the 40–60 word extract, not the hero.
            speakableSelectors: ["[data-answer]"],
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.h1, path },
          ]),
          faqPageSchema(post.faq),
        )}
      />

      <MarketingHero
        eyebrow={post.category}
        title={post.h1}
        subtitle={`${post.readingMinutes} min read · Updated ${new Date(
          post.updated ?? post.published,
        ).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })}`}
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]}
      />

      <main className={`${SURFACE_BG}`}>
        <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 md:py-16">
          <AnswerBlock>{post.answer}</AnswerBlock>

          {headings.length > 2 ? (
            <nav
              aria-label="On this page"
              className="border-border/80 bg-card rounded-xl border p-5 shadow-xs"
            >
              <p className="text-xs font-semibold tracking-wide uppercase">
                On this page
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <article>
            <ProseBlocks body={post.body} />
          </article>

          <section className="space-y-4 border-t pt-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Frequently asked
            </h2>
            <dl className="border-border/80 bg-card divide-y rounded-xl border shadow-xs">
              {post.faq.map((item) => (
                <div key={item.q} className="px-5 py-4">
                  <dt className="text-sm font-semibold">{item.q}</dt>
                  <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {related.length ? (
            <section className="space-y-4 border-t pt-8">
              <h2 className="text-xl font-semibold tracking-tight">Read next</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/blog/${r.slug}`}
                      className="border-border/80 bg-card hover:border-brand/40 block h-full rounded-xl border p-4 text-sm font-medium shadow-xs transition-colors"
                    >
                      {r.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-brand/30 bg-brand/[0.06] space-y-2 rounded-xl border p-6">
            <h2 className="text-base font-semibold">
              Want these checks run on your own certificates?
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Send three vendor COIs and we will flag expired coverage, low
              limits and missing endorsements — free, no card required.
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
