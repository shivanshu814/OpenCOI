-- CertShield Week 3: vendor portal tokens, properties (D1), property-scoped requirements
-- Apply on live Supabase US after 001–005.

-- ---------------------------------------------------------------------------
-- Properties (D1)
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  address_line text,
  city text,
  state text,
  postal_code text,
  -- Certificate-holder / AI wording validated per property (not just global)
  certificate_holder_name text,
  additional_insured_wording text,
  owner_llc_names jsonb not null default '[]'::jsonb,
  lender_names jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_org_id_idx on public.properties (org_id);

create table public.property_vendors (
  property_id uuid not null references public.properties (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, vendor_id)
);

create index property_vendors_vendor_id_idx on public.property_vendors (vendor_id);
create index property_vendors_org_id_idx on public.property_vendors (org_id);

-- ---------------------------------------------------------------------------
-- Requirement sets: allow property scope + optional property_id
-- ---------------------------------------------------------------------------
alter table public.requirement_sets
  drop constraint if exists requirement_sets_scope_check;

alter table public.requirement_sets
  add constraint requirement_sets_scope_check
  check (scope in ('global', 'trade', 'property'));

alter table public.requirement_sets
  add column if not exists property_id uuid references public.properties (id) on delete cascade;

create index if not exists requirement_sets_property_id_idx
  on public.requirement_sets (property_id)
  where property_id is not null;

-- ---------------------------------------------------------------------------
-- Documents may be scoped to a property
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists property_id uuid references public.properties (id) on delete set null;

create index if not exists documents_property_id_idx
  on public.documents (property_id)
  where property_id is not null;

-- ---------------------------------------------------------------------------
-- Vendor portal magic-link tokens (F1 — no password)
-- Store only sha256(token); plaintext returned once at issuance.
-- ---------------------------------------------------------------------------
create table public.vendor_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index vendor_portal_tokens_vendor_id_idx
  on public.vendor_portal_tokens (vendor_id);

create index vendor_portal_tokens_org_id_idx
  on public.vendor_portal_tokens (org_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.properties enable row level security;
alter table public.property_vendors enable row level security;
alter table public.vendor_portal_tokens enable row level security;

create policy properties_all on public.properties for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy property_vendors_all on public.property_vendors for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Portal tokens: org members can manage; resolution uses service role
create policy vendor_portal_tokens_all on public.vendor_portal_tokens for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
