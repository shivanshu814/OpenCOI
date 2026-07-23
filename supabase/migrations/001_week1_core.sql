-- CertShield Week 1 core schema (docs/01 §5 + Appendix B)
-- Run in Supabase SQL editor (US region project). RLS on every table.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Orgs & membership
-- ---------------------------------------------------------------------------
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index org_members_user_id_idx on public.org_members (user_id);

-- ---------------------------------------------------------------------------
-- Vendors
-- ---------------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  legal_name text,
  email text,
  phone text,
  trade text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'es')),
  status text not null default 'missing_docs'
    check (status in ('compliant', 'expiring', 'non_compliant', 'missing_docs', 'in_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_org_id_idx on public.vendors (org_id);

-- ---------------------------------------------------------------------------
-- Requirements (global + trade templates; property overrides = W3)
-- ---------------------------------------------------------------------------
create table public.requirement_sets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  scope text not null check (scope in ('global', 'trade')),
  trade text,
  rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index requirement_sets_org_id_idx on public.requirement_sets (org_id);

-- ---------------------------------------------------------------------------
-- Documents → extractions → compliance checks (Appendix B pipeline)
-- ---------------------------------------------------------------------------
create type public.document_pipeline_status as enum (
  'uploaded',
  'extracted',
  'checked',
  'in_internal_review',
  'published',
  'accepted',
  'overridden',
  'disputed'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  status public.document_pipeline_status not null default 'uploaded',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_org_id_idx on public.documents (org_id);
create index documents_vendor_id_idx on public.documents (vendor_id);
create index documents_status_idx on public.documents (status);

create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  payload jsonb not null,
  model_version text not null,
  prompt_version text not null,
  overall_confidence numeric(4, 3),
  cost_usd numeric(10, 6),
  latency_ms int,
  created_at timestamptz not null default now()
);

create index extractions_document_id_idx on public.extractions (document_id);

create table public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  overall_verdict text not null
    check (overall_verdict in ('PASS', 'FAIL', 'MISSING', 'EXPIRING')),
  customer_decision text check (customer_decision in ('accepted', 'overridden', 'disputed')),
  customer_decision_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index compliance_checks_document_id_idx on public.compliance_checks (document_id);
create index compliance_checks_vendor_id_idx on public.compliance_checks (vendor_id);

-- ---------------------------------------------------------------------------
-- Append-only audit trail
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  actor_type text not null check (actor_type in ('system', 'admin', 'customer', 'vendor')),
  actor_id text,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_events_org_id_idx on public.audit_events (org_id);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);

-- Block updates/deletes on audit_events
create or replace function public.deny_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

create trigger audit_events_no_update
  before update or delete on public.audit_events
  for each row execute function public.deny_audit_mutation();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.vendors enable row level security;
alter table public.requirement_sets enable row level security;
alter table public.documents enable row level security;
alter table public.extractions enable row level security;
alter table public.compliance_checks enable row level security;
alter table public.audit_events enable row level security;

create policy orgs_select on public.orgs for select
  using (public.is_org_member(id));

create policy org_members_select on public.org_members for select
  using (public.is_org_member(org_id));

create policy vendors_all on public.vendors for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy requirement_sets_all on public.requirement_sets for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy documents_all on public.documents for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy extractions_all on public.extractions for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy compliance_checks_all on public.compliance_checks for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy audit_events_select on public.audit_events for select
  using (public.is_org_member(org_id));

create policy audit_events_insert on public.audit_events for insert
  with check (public.is_org_member(org_id));

-- Storage bucket: create "cois" in dashboard (private). Path: {org_id}/{vendor_id}/{doc_id}.pdf
