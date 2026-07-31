-- 026: SEO health snapshots — the storage behind the weekly automated run.
--
-- This table is deliberately NOT org-scoped. Every other table in this schema
-- describes a customer's vendors and documents; this one describes OUR OWN
-- marketing site (indexability, Core Web Vitals, IndexNow submissions). No
-- customer should ever read it, and no customer owns a row in it.
--
-- That makes the RLS shape unusual but not an exception to non-negotiable
-- rule 3: RLS is ENABLED with **zero policies**, which under Postgres means
-- every `anon` and `authenticated` request returns nothing at all. Only the
-- service-role key — used by the Inngest job and nothing else — can read or
-- write. A table with RLS on and no policy is strictly more locked down than
-- one with an org-scoped policy, not less.
--
-- Retention: one row per weekly run, ~52/year. Small enough to keep forever,
-- and the year-over-year diff is the entire point — a single snapshot says
-- nothing, the trend says whether the SEO work is compounding.

create table if not exists public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  captured_at timestamptz not null default now(),

  -- Which origin was measured. Stored per row so a domain migration does not
  -- silently make old and new numbers look like one continuous trend.
  site_url text not null,

  -- Crawl health across every sitemap URL.
  urls_total int not null default 0,
  urls_ok int not null default 0,
  urls_broken int not null default 0,
  urls_noindex int not null default 0,
  missing_title int not null default 0,
  missing_description int not null default 0,
  missing_canonical int not null default 0,

  -- Core Web Vitals / Lighthouse, median across the sampled URLs.
  -- Null = the PageSpeed API was unreachable or rate-limited this run, which
  -- is a real and expected outcome on the keyless free tier. Null must never
  -- be read as zero.
  perf_score int,
  seo_score int,
  lcp_ms int,
  cls numeric(6, 3),

  -- Search Console. Null until a Google credential is wired — the job is
  -- designed to run useful without one, so these stay null rather than
  -- blocking the whole snapshot.
  gsc_clicks int,
  gsc_impressions int,
  gsc_avg_position numeric(6, 2),
  gsc_indexed int,

  -- IndexNow push result for this run.
  indexnow_submitted int not null default 0,
  indexnow_ok boolean not null default false,

  -- Fingerprint of the crawled surface: the sitemap URL list plus each page's
  -- title and description. The job runs every 12h, but IndexNow's own guidance
  -- is to submit **on change** — resubmitting an unchanged set twice a day is
  -- how a host gets throttled or ignored. Comparing this hash to the previous
  -- run is what makes "every 12 hours" a fast *detector* without becoming a
  -- spammer. A weekly floor re-push covers the case where a submission was
  -- silently dropped.
  content_hash text,

  -- Sorted list of problems found this run. Compared against the previous run
  -- so a permanently-broken URL emails once, not twice a day forever.
  problems jsonb not null default '[]'::jsonb,

  -- Everything the run could not do, and why. Read this before concluding a
  -- metric "went to zero" — an unwired credential and a genuine regression
  -- look identical in the numbers and completely different here.
  skipped jsonb not null default '[]'::jsonb,

  -- Full per-URL detail, for diffing two runs without re-crawling.
  detail jsonb not null default '{}'::jsonb
);

comment on table public.seo_snapshots is
  'Weekly automated SEO health snapshot for the marketing site. Not org-scoped: '
  'RLS is enabled with no policies so only the service role (the Inngest job) '
  'can touch it.';

comment on column public.seo_snapshots.skipped is
  'Array of {check, reason} for every step that could not run — an unwired API '
  'key and a real regression both show as a missing metric, and only this '
  'column tells them apart.';

create index if not exists seo_snapshots_captured_at_idx
  on public.seo_snapshots (captured_at desc);

alter table public.seo_snapshots enable row level security;

-- No policies, on purpose. See the header comment: this denies anon and
-- authenticated entirely and leaves the service role as the only writer.
