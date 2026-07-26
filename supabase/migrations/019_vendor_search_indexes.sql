-- 019: indexes for server-side vendor search, filtering, and paging.
--
-- The vendors page now filters and pages in Postgres instead of pulling the
-- whole roster and filtering in JS (which silently truncated at PostgREST's
-- 1000-row ceiling). These indexes keep that path fast as rosters grow.

-- Status chips + the default name-ordered page both scan by org first.
create index if not exists vendors_org_status_idx
  on public.vendors (org_id, status);

create index if not exists vendors_org_name_idx
  on public.vendors (org_id, name);

-- Case-insensitive substring search across name / trade / email.
-- Plain b-tree indexes cannot serve `ilike '%needle%'`; trigram indexes can.
create extension if not exists pg_trgm;

create index if not exists vendors_name_trgm_idx
  on public.vendors using gin (name gin_trgm_ops);

create index if not exists vendors_trade_trgm_idx
  on public.vendors using gin (trade gin_trgm_ops);

create index if not exists vendors_email_trgm_idx
  on public.vendors using gin (email gin_trgm_ops);

-- Audit trail is always read newest-first within an org, and filtered by
-- action / actor from the trail UI.
create index if not exists audit_events_org_created_idx
  on public.audit_events (org_id, created_at desc);

-- Review queue and "awaiting decision" both select by org + status, ordered
-- by time; a composite index avoids a sort on every dashboard render.
create index if not exists documents_org_status_created_idx
  on public.documents (org_id, status, created_at desc);
