import type { Post } from "@/content/blog/types";

import { post as acordForms } from "@/content/blog/acord-25-vs-acord-27-vs-acord-28";
import { post as additionalInsured } from "@/content/blog/additional-insured-vs-certificate-holder";
import { post as buyersGuide } from "@/content/blog/best-coi-tracking-software-buyers-guide";
import { post as cg2010 } from "@/content/blog/cg-20-10-vs-cg-20-37";
import { post as spreadsheetTemplate } from "@/content/blog/coi-tracking-spreadsheet-template";
import { post as howMuchInsurance } from "@/content/blog/how-much-insurance-should-a-contractor-have";
import { post as howToTrack } from "@/content/blog/how-to-track-vendor-insurance-certificates";
import { post as primaryNonContrib } from "@/content/blog/primary-and-noncontributory-meaning";
import { post as expiredCoi } from "@/content/blog/vendor-coi-expired-what-to-do";
import { post as waiverSubrogation } from "@/content/blog/waiver-of-subrogation-meaning";
import { post as whatIsCoi } from "@/content/blog/what-is-a-certificate-of-insurance";
import { post as whatToCheck } from "@/content/blog/what-to-check-on-a-certificate-of-insurance";

/**
 * The blog registry.
 *
 * Order here is EDITORIAL order — what a first-time reader should meet first —
 * not publish date. Every post shipped on the same day, so sorting by date
 * would be arbitrary, and the index page is a hub whose job is to route people
 * to the right entry point.
 */
const POSTS: readonly Post[] = [
  whatIsCoi,
  whatToCheck,
  additionalInsured,
  cg2010,
  waiverSubrogation,
  primaryNonContrib,
  acordForms,
  howToTrack,
  howMuchInsurance,
  spreadsheetTemplate,
  buyersGuide,
  expiredCoi,
];

export const posts = POSTS;

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postsByCategory(): {
  category: Post["category"];
  posts: readonly Post[];
}[] {
  const order: Post["category"][] = [
    "Definitions",
    "Guides",
    "Benchmarks",
    "Templates",
  ];
  return order
    .map((category) => ({
      category,
      posts: POSTS.filter((p) => p.category === category),
    }))
    .filter((group) => group.posts.length > 0);
}

/** Most recent `dateModified` across the corpus — drives the blog index sitemap entry. */
export function latestPostDate(): string {
  return POSTS.map((p) => p.updated ?? p.published).sort().at(-1) ?? "2026-07-31";
}
