import { CheckoutButton } from "@/components/checkout-button";
import { CheckoutLegalNote } from "@/components/checkout-legal-note";
import { ChecksMarquee } from "@/components/checks-marquee";
import { CountUp } from "@/components/count-up";
import { EmberField } from "@/components/ember-field";
import { FaqAccordion } from "@/components/faq-accordion";
import { HeroMockup } from "@/components/hero-mockup";
import { INK_BG, InkAtmosphere, SURFACE_BG } from "@/components/ink-atmosphere";
import { Magnetic } from "@/components/magnetic";
import { MarketingShell } from "@/components/marketing-shell";
import { PointerGlow } from "@/components/pointer-glow";
import { ProcessWalkthrough } from "@/components/process-walkthrough";
import { Reveal } from "@/components/reveal";
import { SectionEyebrow } from "@/components/section-eyebrow";
import { SpotlightCard } from "@/components/spotlight-card";
import { Stagger } from "@/components/stagger";
import { TiltCard } from "@/components/tilt-card";
import { TypedText } from "@/components/typed-text";
import { WordReveal } from "@/components/word-reveal";
import { ExtractionPreviewCard } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { BOOKING_URL } from "@/lib/seo/site";
import {
  Building2,
  Check,
  CheckCircle2,
  FileSearch,
  FileUp,
  HardHat,
  Mail,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  faqPageSchema,
  graph,
  softwareApplicationSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import type { Metadata } from "next";
import Link from "next/link";

// Title/description verbatim from docs/02-BRANDING_SEO.md §3. `pageMetadata`
// sets `title.absolute` so the root layout's "%s · CertShield" template cannot
// append to it, and adds the canonical + OG/Twitter card.
export const metadata: Metadata = pageMetadata({
  title: "COI Tracking Software for Property Managers — CertShield",
  description:
    "AI reads vendor insurance certificates, flags gaps, and chases renewals automatically. Never work with an uninsured vendor again. From $99/mo.",
  path: "/",
  keywords: [
    "coi tracking software",
    "certificate of insurance tracking software",
    "vendor insurance tracking",
    "coi compliance software",
    "coi tracking for property managers",
  ],
});

const faq = [
  {
    q: "How accurate is the AI?",
    a: "Every field is extracted with a confidence score. Anything below 90% confidence — or any failed check — goes to human review before you see a verdict, with the original PDF side-by-side; in fact, today every verdict is human-verified before publishing. We benchmark against a growing test set of real certificates — tracking toward 98%+ automated accuracy on dates and limits — and every correction becomes a permanent regression test. Unlike a person at 6 PM, it never skips the endorsement page.",
  },
  {
    q: "Will you catch mid-term cancellations automatically?",
    a: "Expirations and renewals we catch and chase automatically. Mid-term cancellations aren't broadcast by carriers — no tool can guarantee catching a silent cancellation. We mitigate with agent confirmations, notice-of-cancellation endorsements, and re-verification on every new document.",
  },
  {
    q: "How is this different from myCOI / TrustLayer / Jones?",
    a: "Same category of protection, built for your size: they're $8–25K/year enterprise contracts with sales processes; we're $99–499/month, live in a day, no annual lock-in, and the AI does the reading instead of an outsourced review team.",
    link: {
      href: "/blog/best-coi-tracking-software-buyers-guide",
      label: "See what to compare before you buy",
    },
  },
  {
    q: "What's included at $99?",
    a: "Starter tracks 25 vendors with AI COI verification (including endorsement checks), EN/ES email chase, dashboard, audit trail, and compliance report PDFs.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, monthly plans, no cancellation fee, full data export in one click. We keep customers with results, not contracts.",
  },
  {
    q: "Do you integrate with AppFolio / Buildium?",
    a: "CSV and email-forwarding today (works with everything); native two-way sync is coming soon — Business-plan customers get it first.",
  },
];

/**
 * Home's own graph nodes. `Organization` and `WebSite` are NOT repeated here —
 * `MarketingShell` emits them once for every marketing page, and the nodes
 * below reference that same `@id`. The previous hand-written block declared a
 * second Organization with `url: getcertshield.vercel.app`, which asserted a
 * different company than the one the site is actually served from — exactly the
 * entity split docs/02 §5.9 exists to prevent.
 */
const jsonLd = graph(
  softwareApplicationSchema(),
  webPageSchema({
    title: "COI Tracking Software for Property Managers — CertShield",
    description:
      "AI reads vendor insurance certificates, flags gaps, and chases renewals automatically. Never work with an uninsured vendor again. From $99/mo.",
    path: "/",
  }),
  faqPageSchema(faq),
);

const beforeItems = [
  "Certificates buried in email threads and shared drives",
  "Staff glance at the first page and miss the attachments",
  "Renewal dates remembered on a sticky note, if at all",
  "Audit week means digging for PDFs one by one",
];

const afterItems = [
  "Every certificate read in full, attachments included",
  "One screen: green, amber, red — who needs attention today",
  "Renewal reminders sent for you, in English or Spanish",
  "Every document kept, with a record of who did what",
];

/** Keep the trade codes — this is the credibility section — but say what each one means. */
const endorsementBullets = [
  "Are you actually named on their policy while the work is happening? (CG 20 10)",
  "And still named after the job is finished, if something fails later? (CG 20 37)",
  "Has their insurer given up the right to come after you? (waiver of subrogation)",
  "Does their policy pay first, before yours? (primary & non-contributory)",
  "And we flag it when the certificate claims all this but the actual form isn't attached",
];

const deepDives: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Reads the document, and admits when it's unsure",
    body: "Every field gets a confidence score. If anything is below 90%, or any check fails, a person looks at it next to the original PDF before you ever see a result. Nothing is ever approved silently.",
    icon: FileSearch,
  },
  {
    title: "Chases renewals so you don't have to",
    body: "Reminder emails go to the vendor and to their insurance agent — the agent is usually the one who actually sends the certificate. English and Spanish, live today. Text-message reminders are coming soon.",
    icon: Mail,
  },
  {
    title: "Easy for your vendors, which is why it works",
    body: "Vendors get a link and upload from their phone — no account, no password to forget. Or they email the certificate to your own CertShield address and it lands in the same place.",
    icon: FileUp,
  },
  {
    title: "Proof when an owner, lender or insurer asks",
    body: "Set different insurance requirements per building or per job, then hand over a clean report PDF. Everything is already collected and dated.",
    icon: Building2,
  },
];

/**
 * Plain-English explainer steps. No acronyms, no trade codes — a reader who has
 * never heard the phrase "certificate of insurance" has to follow these.
 */
const plainSteps: { title: string; body: string }[] = [
  {
    title: "Send us the PDF",
    body: "Upload it, or just forward the email your vendor sent. You can also send the vendor a link and they upload it themselves — no account, no password.",
  },
  {
    title: "We read it and check it",
    body: "Is the insurance still active? Are the amounts high enough? Are the extra forms attached? You get a plain green / amber / red answer, not a document to read.",
  },
  {
    title: "We chase the renewals",
    body: "When a policy is about to run out, we email the vendor and their insurance agent until a new certificate arrives. In English or Spanish.",
  },
];

/** Role cards — personas 1 and 2 from 01-PRODUCT_SPEC §2, one distinct pain each. */
const roles: {
  title: string;
  scale: string;
  body: string;
  win: string;
  icon: LucideIcon;
}[] = [
  {
    title: "For property managers",
    scale: "20–2,000 units",
    body: "A vendor's GL lapses, they do a turn on unit 4B, and the claim lands on your E&O. Meanwhile an owner wants proof of compliance by Friday.",
    win: "Per-property requirements and owner report PDFs, ready before they ask.",
    icon: Building2,
  },
  {
    title: "For general contractors",
    scale: "10–100 subs",
    body: "Your GL carrier audits you on your subs' coverage, and every project owner writes different additional-insured wording. Subs churn every season.",
    win: "Endorsement checks per project, so a sub never gets dispatched uninsured.",
    icon: HardHat,
  },
];

const plans = [
  {
    name: "Starter",
    /** Rendered by <CountUp>, which prefixes the "$". Single source of truth. */
    priceValue: 99,
    note: "25 vendors",
    planId: "starter" as const,
    highlights: [
      "Certificates read and checked in full",
      "Renewal reminders in English + Spanish",
      "One dashboard, everything on file",
    ],
  },
  {
    name: "Pro",
    priceValue: 249,
    note: "100 vendors",
    planId: "pro" as const,
    featured: true,
    highlights: [
      "Vendors upload it themselves",
      "Different rules per building",
      "Reports you can hand to owners",
    ],
  },
  {
    name: "Business",
    priceValue: 499,
    note: "Unlimited",
    planId: "business" as const,
    highlights: [
      "Team accounts and permissions",
      "Tax forms, licences and signatures too",
      "Reminders sent under your own name",
    ],
    comingSoon: ["Direct sync with AppFolio / Buildium"],
  },
];

const honesty = {
  weDo: [
    "Spot policies about to expire and chase the renewal for you",
    "Check the cover amounts, the dates, and the attached forms",
    "Have a person check every result before you see it",
  ],
  weDont: [
    "Promise to catch a policy cancelled quietly mid-term",
    "Give you legal or insurance advice",
    "Approve anything without your final say",
  ],
};

/**
 * Hero trust stat. Every word here is verifiable from the ACORD 25 form itself —
 * no invented market percentage, so it carries no disclaimer.
 *
 * TODO(02 §5.4): once we've audited real volume, swap this for our own published
 * figure ("We analyzed 1,000 vendor COIs — X% had a compliance gap"). That stat
 * is stronger, but only once the number is real and citable.
 */
const trustStat = {
  value: 4,
  claim: "extra insurance forms the certificate alone doesn't prove",
  note: "Staff check the front page and stop. The proof is on the attachments — CG 20 10, CG 20 37, waiver of subrogation, primary & non-contributory.",
};

/**
 * Pre-revenue social proof. We have no customers, so this section does NOT
 * fake quotes — it uses the two things that are actually true and verifiable:
 * the price gap vs the incumbents, and a founder who reviews every verdict by
 * hand. Replace `founderProof` with real testimonials as they land; the three
 * `foundingSlots` are a genuine offer, not a placeholder graveyard.
 */

/** $ ranges are researched public estimates (10-FAQ §5: "$8–25K/year"), labelled as such. */
const priceCompare = [
  { name: "Jones", price: "$15–25K / yr", note: "Enterprise, demo-gated" },
  { name: "Certificial", price: "$10–25K / yr", note: "Custom quote only" },
  { name: "TrustLayer", price: "$10–20K / yr", note: "Annual contract" },
  { name: "myCOI", price: "$8–15K / yr", note: "Outsourced review team" },
  { name: "SmartCompliance", price: "$8–15K / yr", note: "Annual contract" },
];

const founderProof = [
  "Every verdict on your account is reviewed by me personally before it publishes — not a queue, not an offshore team. That is why I can charge $99 instead of $8,000.",
  "I read the endorsement pages. CG 20 10, CG 20 37, waiver of subrogation, primary & non-contributory — the four things staff skip at 6 PM.",
  "If the AI is under 90% confident on any field, it does not guess. It comes to me.",
];

/** A real offer, priced and dated — not a placeholder. */
const foundingSlots = [
  { seat: "01", perk: "Free 3-cert audit, 24h turnaround" },
  { seat: "02", perk: "Founding price locked for 12 months" },
  { seat: "03", perk: "Direct line to me, not a support inbox" },
];

/**
 * Jones/TrustLayer-style hero stat row. Every figure here is TRUE TODAY and
 * doc-backed — no volume metrics ("40K+ projects") because we don't have volume
 * yet, and inventing it would be the one thing 08-LEGAL_COMPLIANCE forbids.
 * Swap in real portfolio/vendor counts once they beat these on impact.
 */
const heroStats: {
  n: number;
  prefix?: string;
  suffix?: string;
  label: string;
}[] = [
  { n: 40, prefix: "~", suffix: "s", label: "To read one document" },
  { n: 6, suffix: "+", label: "Checks per document" },
  { n: 100, suffix: "%", label: "Checked by a human" },
  { n: 99, prefix: "$", label: "Not $8,000 a year" },
];

/**
 * The two hero/footer CTAs. `cs-sheen` sweeps a single band of light across the
 * button on hover or keyboard focus — the whole page is about a document being
 * read, and the sweep is the same gesture as the scan line on the mockup.
 * `relative overflow-hidden` is what the ::after needs to travel inside.
 */
const primaryCta =
  "cs-cta-pulse bg-brand text-brand-foreground hover:bg-brand/90 cs-sheen relative h-10 overflow-hidden px-5 text-sm font-semibold shadow-[0_8px_24px_-10px_rgba(0,184,132,0.8)] transition-[transform,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-px hover:shadow-[0_14px_34px_-10px_rgba(0,184,132,0.9)] active:translate-y-0 active:scale-[0.985]";

const cardShadow = "shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)]";
const cardBase = `bg-card overflow-hidden rounded-2xl border border-border/80 ${cardShadow}`;
/** Card hover: 2px lift + deeper shadow + brand-tinted border. transform/opacity only. */
const cardHover =
  "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[0_22px_60px_-20px_rgba(15,23,42,0.28)]";

export default function HomePage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />

      {/* 1. Hero — primary Free audit */}
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere />
        <PointerGlow />
        <EmberField />
        {/* Periodic light pass — staggered per section so the page
            never sweeps in unison. */}
        <div
          aria-hidden
          className="cs-light-pass pointer-events-none absolute inset-0"
          style={{ animationDelay: "0s" }}
        />
        {/* cs-scroll-recede: the hero visibly sinks away as you scroll past it.
            Only the exit range animates, so load/LCP see a static hero. */}
        <div className="cs-scroll-recede relative mx-auto grid max-w-6xl items-center gap-x-14 gap-y-12 px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,24rem)]">
          <div>
            {/*
              The eyebrow leads with the app name so Google's OAuth-consent
              reviewer bot and any AI/answer engine crawling the h1 area
              picks up "CertShield" as the product name unambiguously. Their
              automated verifier reads h1 + immediate context, and a bare
              category label like "COI tracking for property managers" made
              them flag the app name as "not matching the homepage" even
              though "CertShield" appears 73× elsewhere on the page.
            */}
            <p className="text-brand cs-fade-rise text-xs font-semibold tracking-[0.18em] uppercase">
              CertShield <span className="text-brand/60">·</span> COI tracking
              for property managers &amp; contractors
            </p>
            {/*
              The h1 is what Google's OAuth-consent branding reviewer bot
              reads to determine "is the app name on the homepage the same
              as the OAuth consent screen name?". A pure marketing tagline
              (which "Never work with an uninsured vendor again" is) failed
              that check twice, even with an eyebrow above it naming the
              product. The reviewer only looks at the h1's own text.
              Prepending "CertShield —" satisfies the automated check
              without stripping the tagline. Visually the app name reads
              like a marketing prefix; screen readers get the product
              name front-and-centre.
            */}
            <h1
              className="cs-rise-in mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-white md:text-5xl lg:text-[3.25rem]"
              style={{ animationDelay: "60ms" }}
            >
              CertShield — Never work with an uninsured vendor again.
            </h1>
            <p
              className="cs-fade-rise mt-6 max-w-xl text-base leading-relaxed text-white/65 md:text-lg"
              style={{ animationDelay: "170ms" }}
            >
              CertShield reads vendor insurance certificates with AI, flags
              expired or insufficient coverage, and chases renewals
              automatically — so the liability never lands on you.
            </p>

            {/* Trust stat — see `trustStat` above. No disclaimer needed: it's checkable. */}
            <div
              className="cs-fade-rise mt-8 flex max-w-xl items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-colors duration-300 hover:border-brand/30 hover:bg-white/[0.07] sm:gap-5 sm:p-5"
              style={{ animationDelay: "260ms" }}
            >
              <p className="text-brand shrink-0 text-3xl leading-none font-semibold tabular-nums tracking-tight sm:text-4xl">
                <CountUp value={trustStat.value} durationMs={900} />
              </p>
              <div className="min-w-0">
                <p className="text-sm leading-snug font-medium text-white/85">
                  {trustStat.claim}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                  {trustStat.note}
                </p>
              </div>
            </div>

            <div
              className="cs-fade-rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "340ms" }}
            >
              <Magnetic>
                <Button
                  size="lg"
                  className={primaryCta}
                  render={<Link href="/free-audit" />}
                >
                  Get my free audit
                </Button>
              </Magnetic>
              <CheckoutButton
                planId="starter"
                label="Start at $99/mo"
                variant="outline"
                className="h-10 border-white/20 bg-transparent px-5 text-sm text-white hover:bg-white/10 hover:text-white"
              />
            </div>
            <p
              className="cs-fade-rise mt-5 text-sm text-white/45"
              style={{ animationDelay: "420ms" }}
            >
              Send us 3 certificates and we&apos;ll check them free — no card
              needed. After that, from $99/month. Cancel anytime.
            </p>

            {/* Stat row — competitor pattern, but only figures that are true today.
                Staggered per stat rather than as one block, so the four figures
                land in sequence and each number gets its own beat. Pure CSS load
                choreography (no observer) because this is above the fold. */}
            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-4 sm:gap-x-4">
              {heroStats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="cs-fade-rise group relative"
                  style={{ animationDelay: `${500 + i * 90}ms` }}
                >
                  {/* Tick that grows out of the rule above on hover. */}
                  <span
                    aria-hidden
                    className="bg-brand absolute -top-[1.8rem] left-0 h-px w-6 origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-x-100"
                  />
                  <dt className="text-2xl leading-none font-semibold tabular-nums tracking-tight text-white transition-colors duration-300 group-hover:text-brand">
                    <CountUp
                      value={stat.n}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                      durationMs={1100 + i * 90}
                    />
                  </dt>
                  <dd className="mt-1.5 text-xs leading-snug font-medium text-white/45 transition-colors duration-300 group-hover:text-white/70">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroMockup
            className="cs-fade-rise mt-2 lg:mt-0"
            style={{ animationDelay: "220ms" }}
          />
        </div>

        {/* The always-on checks belt — the page's heartbeat between sections. */}
        <ChecksMarquee className="relative" />
      </section>

      {/*
        Explicit "About CertShield" band. Two reasons this exists as its own
        section, not just as body text:
         1. Google's OAuth-consent branding compliance bot rejects the site
            twice for HOMEPAGE_HAS_SUFFICIENT_CONTENT + APP_NAME_CONSISTENT
            even with the app name in the h1 and 2,258 words on the page.
            The bot looks for a semantic h2 that names the product and
            explains it in the same block; that's what this is.
         2. It's a legitimately useful above-the-fold summary for a first-
            time reader who doesn't yet know what CertShield is. The
            marketing tagline in the hero doesn't do that job — it hooks
            an existing pain, doesn't introduce the product.
      */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            About CertShield
          </h2>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed md:text-lg">
            CertShield is vendor insurance compliance software for US property
            managers and small general contractors. Its AI reads certificates of
            insurance (ACORD 25 forms), verifies coverage limits,
            additional-insured endorsements and expiration dates against each
            company&rsquo;s requirements, then automatically chases vendors and
            their insurance agents for renewals by email in English and Spanish.
            Every verdict is reviewed by a human before it publishes, with
            audit-ready document trails. CertShield replaces spreadsheet-based
            COI tracking at SMB pricing, from $99/month.
          </p>
        </div>
      </section>

      {/* 2. Plain-English explainer — assume the reader has never heard "COI". */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16">
          <Reveal className="max-w-3xl">
            <SectionEyebrow>In plain English</SectionEyebrow>
            {/*
              This h2 names the app on purpose. Google's OAuth-consent
              branding bot reads h1 + h2 tags to check APP_NAME_CONSISTENT
              and HOMEPAGE_HAS_SUFFICIENT_CONTENT — a bare "What this does"
              tests negative for both. Naming CertShield here gives the bot
              a semantic anchor it can match to the OAuth app name.
            */}
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <WordReveal text={"What CertShield actually does"} />
            </h2>
            <p className="mt-5 text-lg leading-snug font-medium md:text-xl">
              You hire{" "}
              <TypedText
                phrases={[
                  "plumbers",
                  "roofers",
                  "electricians",
                  "landscapers",
                  "cleaners",
                ]}
                className="text-brand font-semibold"
                holdMs={1500}
                srLabel="plumbers, roofers, electricians, landscapers and cleaners"
                reserveCh={12}
              />
            </p>
            <p className="mt-3 text-base leading-relaxed md:text-lg">
              Each one is supposed to carry insurance. If their insurance has
              quietly expired and they flood a unit,{" "}
              <strong className="font-semibold">you</strong> get sued — not
              them.
            </p>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed md:text-lg">
              Proof of that insurance is a one-page PDF called a{" "}
              <strong className="text-foreground font-semibold">
                certificate of insurance
              </strong>{" "}
              (a &ldquo;COI&rdquo;). Most companies collect them in email and
              track the expiry dates in a spreadsheet, by hand. CertShield reads
              those PDFs for you, tells you who is covered and who isn&apos;t,
              and emails the vendor to renew before it lapses.
            </p>
          </Reveal>

          <ol className="mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
            {plainSteps.map((step, i) => (
              <Reveal
                as="li"
                key={step.title}
                delay={i * 90}
                className={`${cardBase} ${cardHover} group flex flex-col`}
              >
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <span className="bg-brand-muted text-brand cs-icon-pop flex size-9 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-brand/15 transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 group-hover:shadow-[0_6px_18px_-6px_rgba(0,184,132,0.5)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>

          <p className="text-muted-foreground mt-8 max-w-3xl text-sm leading-relaxed">
            That&apos;s it. No training, no setup project — forward a PDF and
            you get an answer.
          </p>
        </div>
      </section>

      {/* 3. Social proof — real proof, not invented quotes (no customers yet) */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-16">
          <Reveal className="max-w-2xl">
            <SectionEyebrow>Trust</SectionEyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <WordReveal
                text={"We're new. So here's the proof instead of a quote wall."}
              />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              CertShield launched in 2026. Rather than borrow someone
              else&apos;s logo or invent a testimonial, here is exactly what you
              get and what it costs against the incumbents.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            {/* Founder guarantee — verifiable, in the founder's own voice */}
            <div className={`${cardBase} ${cardHover} group flex flex-col`}>
              <div className="from-brand via-brand/70 to-brand/30 h-1 w-full bg-gradient-to-r" />
              <div className="flex flex-1 flex-col p-5 sm:p-7">
                <span className="bg-brand-muted text-brand cs-icon-pop flex size-11 items-center justify-center rounded-xl ring-1 ring-brand/15 transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 group-hover:shadow-[0_6px_18px_-6px_rgba(0,184,132,0.5)]">
                  <ShieldCheck className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  The founder reviews every verdict
                </h3>
                <Stagger
                  as="ul"
                  animation="cs-row-in"
                  step={110}
                  start={140}
                  className="mt-4 flex-1 space-y-3.5"
                >
                  {founderProof.map((line) => (
                    <li
                      key={line}
                      className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                    >
                      <CheckCircle2
                        className="text-brand mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </Stagger>
                <p className="text-muted-foreground mt-6 border-t border-slate-100 pt-5 text-xs leading-relaxed">
                  — Shivanshu, founder. Free audits are capped at 10/day so this
                  promise stays true.
                </p>
              </div>
            </div>

            {/* Price gap — the actual differentiator */}
            <div className={`${cardBase} ${cardHover} flex flex-col`}>
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <p className="text-sm font-semibold text-slate-800">
                  What the alternatives cost
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  Researched public estimates — most hide pricing behind a demo
                </p>
              </div>
              {/* Staggered top-to-bottom on purpose: the rows fill in at the
                  incumbents' prices and CertShield's lands last. The order is
                  the argument, so the motion follows it. */}
              <Stagger
                as="ul"
                animation="cs-row-in"
                step={80}
                className="divide-y divide-slate-100"
              >
                {priceCompare.map((c) => (
                  <li
                    key={c.name}
                    className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors duration-200 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700 transition-colors duration-200 group-hover:text-slate-900">
                        {c.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {c.note}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-500 transition-colors duration-200 group-hover:text-red-600">
                      {c.price}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 bg-emerald-50/60 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900">
                      CertShield
                    </p>
                    <p className="text-[11px] font-medium text-emerald-700/70">
                      Monthly, no lock-in, pricing on the page
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-800">
                    $1.2–6K / yr
                  </span>
                </li>
              </Stagger>
            </div>
          </div>

          {/* Founding-customer offer — a real offer, not a placeholder */}
          <div className="mt-8 rounded-2xl border border-brand/25 bg-brand-muted/40 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-lg">
                <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                  Three founding-customer seats
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  This is where the testimonials will go. Take a seat and yours
                  is the first one on the page.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-brand text-brand-foreground hover:bg-brand/90 font-semibold"
                render={<Link href="/free-audit" />}
              >
                Get my free audit
              </Button>
            </div>

            <Stagger
              as="ul"
              step={100}
              className="mt-6 grid gap-3 sm:grid-cols-3"
            >
              {foundingSlots.map((slot) => (
                <li
                  key={slot.seat}
                  // items-baseline, not items-start: the seat number is text-xs
                  // and the perk is text-sm, so top-aligning them leaves the
                  // number visibly floating above the line of text.
                  className="bg-card/80 group flex items-baseline gap-3 rounded-xl border border-brand/15 p-4 transition-[transform,border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-brand/40 hover:bg-card hover:shadow-[0_14px_34px_-18px_rgba(0,184,132,0.45)]"
                >
                  <span className="text-brand/50 text-xs font-semibold tabular-nums transition-colors duration-300 group-hover:text-brand">
                    {slot.seat}
                  </span>
                  <span className="text-sm leading-snug font-medium">
                    {slot.perk}
                  </span>
                </li>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* 3. Pain → after */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-2xl">
            <SectionEyebrow>Today vs. with us</SectionEyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <WordReveal
                text={"Spreadsheet chaos — or coverage you can actually see."}
              />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              Most teams track vendor insurance in email and spreadsheets. That
              works until a lapse, a lawsuit, or an owner audit.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
            {/* The two halves enter from their own sides — the motion carries the
                "this, versus that" relationship before the copy is read. */}
            <Reveal animation="cs-in-left" className={cardBase}>
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
                  <X className="size-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Today</p>
                  <p className="text-[11px] font-medium text-slate-500">
                    Spreadsheet and inbox
                  </p>
                </div>
              </div>
              <Stagger
                as="ul"
                animation="cs-row-in"
                step={80}
                start={220}
                className="divide-y divide-slate-100"
              >
                {beforeItems.map((item) => (
                  <li
                    key={item}
                    className="group flex items-start gap-3 px-5 py-3.5 text-sm leading-relaxed text-slate-600 transition-colors duration-200 hover:bg-slate-50/80"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <X className="size-2.5" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </Stagger>
            </Reveal>

            <Reveal
              animation="cs-in-right"
              delay={110}
              className={`${cardBase} ring-2 ring-brand/20 border-brand/30`}
            >
              <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/80 px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    With CertShield
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700/70">
                    Checked, chased, and filed
                  </p>
                </div>
              </div>
              <Stagger
                as="ul"
                animation="cs-row-in"
                step={80}
                start={330}
                className="divide-y divide-slate-100"
              >
                {afterItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 px-5 py-3.5 text-sm leading-relaxed transition-colors duration-200 hover:bg-emerald-50/60"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </Stagger>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4. Wedge — endorsements */}
      <section className={`relative overflow-hidden border-b ${INK_BG}`}>
        <InkAtmosphere variant="soft" />
        <PointerGlow />
        <EmberField />
        {/* Periodic light pass — staggered per section so the page
            never sweeps in unison. */}
        <div
          aria-hidden
          className="cs-light-pass pointer-events-none absolute inset-0"
          style={{ animationDelay: "-5s" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-x-14 gap-y-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div>
            <SectionEyebrow>
              The part everyone misses on a COI: endorsements
            </SectionEyebrow>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance text-white md:text-3xl">
              The certificate page isn&apos;t the whole story.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
              A certificate is a summary page. The wording that actually
              protects you lives on separate forms attached behind it — and
              that&apos;s the part busy staff skip. These are the four questions
              we answer on every certificate, on every plan.{" "}
              <Link
                href="/blog/cg-20-10-vs-cg-20-37"
                className="text-brand-2 font-medium underline underline-offset-4"
              >
                See CG 20 10 vs CG 20 37 in plain English
              </Link>
              .
            </p>
            {/* Four questions, then the catch. Staggering them means the reader
                arrives at each check one at a time instead of facing a wall. */}
            <Stagger
              as="ul"
              animation="cs-row-in"
              step={95}
              className="mt-8 space-y-3"
            >
              {endorsementBullets.map((b) => (
                <li
                  key={b}
                  className="group flex gap-3 text-sm leading-relaxed text-white/75 transition-colors duration-200 hover:text-white md:text-base"
                >
                  <CheckCircle2
                    className="text-brand mt-0.5 size-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110"
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
            </Stagger>
          </div>

          <div aria-hidden className="cs-float cs-float-offset">
            <TiltCard>
              <ExtractionPreviewCard />
            </TiltCard>
          </div>
        </div>
      </section>

      {/* 5. How it works */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                <WordReveal text={"PDF in. Verdict out. Chase on autopilot."} />
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
                From intake to audit trail — endorsements included, you approve
                every publish. Watch it run, or step through yourself.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/free-audit" />}
            >
              Get my free audit
            </Button>
          </div>

          {/* Jones-style interactive walkthrough — the panel demos each step
              on its own; autoplay hands over the moment the reader navigates. */}
          <Reveal className="mt-12">
            <ProcessWalkthrough />
          </Reveal>
        </div>
      </section>

      {/* 6. Feature deep-dives — 4 rows, not 8 cards. Target of the "Product" nav item. */}
      <section
        id="product"
        className={`${SURFACE_BG} scroll-mt-24 border-b border-border/60`}
      >
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-xl">
            <SectionEyebrow>What&apos;s included</SectionEyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <WordReveal text={"Everything the job actually needs"} />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              Collecting the documents, checking them, chasing the renewals, and
              keeping the proof — all in one place.
            </p>
          </div>

          <ul className="mt-12 divide-y divide-border/60 border-y border-border/60">
            {deepDives.map((item, i) => (
              <Reveal
                as="li"
                key={item.title}
                delay={i * 80}
                className="group flex flex-col gap-4 py-8 transition-colors duration-300 sm:flex-row sm:items-start sm:gap-8"
              >
                <span className="bg-brand-muted text-brand cs-icon-pop flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-brand/15 transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 group-hover:shadow-[0_6px_18px_-6px_rgba(0,184,132,0.5)]">
                  <item.icon className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-x-1">
                  <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed md:text-base">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>

          <p className="text-muted-foreground mt-8 text-sm">
            Full packaging by plan —{" "}
            <Link
              href="/pricing"
              className="text-foreground from-brand to-brand bg-gradient-to-r bg-[length:0%_1.5px] bg-[position:0_100%] bg-no-repeat font-medium transition-[background-size] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:bg-[length:100%_1.5px]"
            >
              see Pricing
            </Link>
            . Native AppFolio / Buildium sync is coming soon; CSV and email-in
            work today.
          </p>
        </div>
      </section>

      {/* 7. Built for PM + GC */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-xl">
            <SectionEyebrow>Built for</SectionEyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <WordReveal text={"One problem, two very different days"} />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              Same liability, different pressure. Pick the one that sounds like
              your week.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
            {roles.map((role, i) => (
              <Reveal
                key={role.title}
                delay={i * 110}
                className={`${cardBase} ${cardHover} group flex flex-col`}
              >
                <div className="from-brand via-brand/70 to-brand/30 h-1 w-full bg-gradient-to-r" />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="bg-brand-muted text-brand cs-icon-pop flex size-11 items-center justify-center rounded-xl ring-1 ring-brand/15 transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 group-hover:shadow-[0_6px_18px_-6px_rgba(0,184,132,0.5)]">
                      <role.icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="text-muted-foreground rounded-md bg-muted px-2 py-1 text-[11px] font-semibold">
                      {role.scale}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">
                    {role.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
                    {role.body}
                  </p>
                  <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed font-medium">
                    <CheckCircle2
                      className="text-brand mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <span>{role.win}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-6 self-start"
                    render={<Link href="/free-audit" />}
                  >
                    Get my free audit
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Honesty */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-xl">
            <SectionEyebrow>Straight talk</SectionEyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <WordReveal text={"What we claim — and what we don't"} />
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed md:text-base">
              Mid-term cancellations aren&apos;t broadcast by carriers — no tool
              can guarantee catching a silent cancellation. We mitigate via
              agent confirmations, notice-of-cancellation endorsements, and
              re-verification on every new cert.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className={cardBase}>
              <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/80 px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    What we do
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700/70">
                    Built into every workflow
                  </p>
                </div>
              </div>
              <Stagger
                as="ul"
                animation="cs-row-in"
                step={90}
                className="divide-y divide-slate-100"
              >
                {honesty.weDo.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 px-5 py-3.5 text-sm leading-relaxed transition-colors duration-200 hover:bg-emerald-50/60"
                  >
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </Stagger>
            </div>

            <div className={cardBase}>
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
                  <X className="size-4" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    What we don&apos;t
                  </p>
                  <p className="text-[11px] font-medium text-slate-500">
                    No overselling — by design
                  </p>
                </div>
              </div>
              <Stagger
                as="ul"
                animation="cs-row-in"
                step={90}
                start={120}
                className="divide-y divide-slate-100"
              >
                {honesty.weDont.map((item) => (
                  <li
                    key={item}
                    className="group flex items-start gap-3 px-5 py-3.5 text-sm leading-relaxed text-slate-600 transition-colors duration-200 hover:bg-slate-50/80"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <X className="size-2.5" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </Stagger>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Pricing */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <SectionEyebrow>Pricing</SectionEyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                <WordReveal text={"Simple plans. No annual contract."} />
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Live in a day. Cancel anytime. Free 3-cert audit included.
              </p>
            </div>
            <Button variant="outline" render={<Link href="/pricing" />}>
              Compare plans
            </Button>
          </div>

          {/* Three cards of near-identical weight, so each gets a pointer
              spotlight — it confirms which one you're actually addressing —
              and the prices count up, because the numbers are the argument. */}
          <Stagger
            step={110}
            className="mt-10 grid items-stretch gap-5 sm:grid-cols-3"
          >
            {plans.map((p, i) => (
              <SpotlightCard
                key={p.name}
                className={
                  p.featured
                    ? `bg-card cs-live-border relative flex flex-col overflow-hidden rounded-2xl border border-brand/40 shadow-[0_16px_48px_-16px_rgba(0,184,132,0.35)] ring-2 ring-brand/25 ${cardHover} hover:shadow-[0_26px_70px_-18px_rgba(0,184,132,0.45)]`
                    : `${cardBase} ${cardHover} relative flex flex-col`
                }
              >
                {p.featured ? (
                  <div className="bg-brand text-brand-foreground relative z-10 px-5 py-1.5 text-center text-[11px] font-semibold tracking-wide uppercase">
                    Most popular
                  </div>
                ) : (
                  <div className="from-brand/80 via-brand/40 to-transparent relative z-10 h-1 bg-gradient-to-r" />
                )}

                {/* z-10 keeps the content above the spotlight gradient. */}
                <div className="relative z-10 flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold tracking-tight">
                      {p.name}
                    </p>
                    <p className="text-muted-foreground text-xs font-medium">
                      {p.note}
                    </p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
                    <CountUp
                      value={p.priceValue}
                      prefix="$"
                      durationMs={900 + i * 120}
                    />
                    <span className="text-muted-foreground text-sm font-normal">
                      /mo
                    </span>
                  </p>

                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-100 pt-5">
                    {p.highlights.map((h) => (
                      <li
                        key={h}
                        className="group/row flex items-start gap-2 text-sm leading-snug transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:translate-x-0.5"
                      >
                        <Check
                          className="text-brand mt-0.5 size-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>{h}</span>
                      </li>
                    ))}
                    {p.comingSoon?.map((h) => (
                      <li
                        key={h}
                        className="text-muted-foreground flex items-start gap-2 text-sm leading-snug"
                      >
                        <span className="mt-0.5 w-3.5 shrink-0 text-center text-xs">
                          —
                        </span>
                        <span>{h} (coming soon)</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <CheckoutButton
                      planId={p.planId}
                      label={`Choose ${p.name}`}
                      variant={p.featured ? "default" : "outline"}
                      className="w-full"
                    />
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </Stagger>
          <CheckoutLegalNote className="mt-6 text-center" />
        </div>
      </section>

      {/* 10. FAQ */}
      <section className={`${SURFACE_BG} border-b border-border/60`}>
        <div className="cs-scroll-rise mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            <WordReveal text={"Questions buyers ask first"} />
          </h2>

          <div className="mt-10">
            <FaqAccordion items={faq} />
          </div>
        </div>
      </section>

      {/* 11. Final CTA */}
      <section className={`relative overflow-hidden ${INK_BG}`}>
        <InkAtmosphere variant="top" />
        <PointerGlow />
        <EmberField />
        {/* Periodic light pass — staggered per section so the page
            never sweeps in unison. */}
        <div
          aria-hidden
          className="cs-light-pass pointer-events-none absolute inset-0"
          style={{ animationDelay: "-9s" }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 md:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-white md:text-4xl">
            <WordReveal text={"Vendor insurance compliance on autopilot."} />
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-white/55">
            Free 3-cert audit — no card required. Or start at $99/mo today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Magnetic>
              <Button
                size="lg"
                className={primaryCta}
                render={<Link href="/free-audit" />}
              >
                Get my free audit
              </Button>
            </Magnetic>
            <CheckoutButton
              planId="starter"
              label="Start at $99/mo"
              variant="outline"
              className="h-10 border-white/20 bg-transparent px-5 text-sm text-white hover:bg-white/10 hover:text-white"
            />
          </div>
          <p className="mt-5 text-sm text-white/45">
            Live in a day. No annual contract.
          </p>
          {/*
            Booking is deliberately a text link, not a third button: docs/04 §1
            keeps ONE offer everywhere (the free 3-cert audit) until $10K MRR,
            and a competing "book a call" button is the classic way that rule
            gets broken. This serves the buyer who will not send documents to a
            stranger without talking first, without outranking the audit.
          */}
          <p className="mt-2 text-sm text-white/45">
            Rather talk first?{" "}
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/70 underline underline-offset-2 hover:text-white"
            >
              Book 15 minutes
            </a>{" "}
            — your timezone, your slot.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
