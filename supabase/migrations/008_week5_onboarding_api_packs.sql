-- Week 5: W-9/license/agreements, white-label, API keys, outbound webhooks.
-- Roles remain owner|admin|member|viewer in DB; app maps to Admin/Manager/Read-only (G1).

alter table public.documents
  add column if not exists doc_kind text not null default 'coi'
    check (doc_kind in ('coi', 'w9', 'license', 'agreement', 'other'));

create index if not exists documents_doc_kind_idx
  on public.documents (org_id, doc_kind);

-- A2: W-9 / TIN (ciphertext only — never store plaintext TIN)
create table if not exists public.vendor_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  legal_name text,
  tin_type text check (tin_type is null or tin_type in ('ein', 'ssn')),
  tin_ciphertext text,
  tin_iv text,
  tin_last4 text,
  address_line text,
  city text,
  state text,
  postal_code text,
  w9_document_id uuid references public.documents (id) on delete set null,
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, vendor_id)
);

create index if not exists vendor_tax_profiles_org_id_idx
  on public.vendor_tax_profiles (org_id);

-- A3: trade/business licenses
create table if not exists public.vendor_licenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  license_number text,
  state text,
  trade text,
  expires_on date,
  document_id uuid references public.documents (id) on delete set null,
  board_lookup_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_licenses_org_id_idx
  on public.vendor_licenses (org_id);
create index if not exists vendor_licenses_vendor_id_idx
  on public.vendor_licenses (vendor_id);
create index if not exists vendor_licenses_expires_on_idx
  on public.vendor_licenses (org_id, expires_on);

-- A5: agreements + Documenso e-sign
create table if not exists public.vendor_agreements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  title text not null default 'Hold-harmless / indemnification',
  document_id uuid references public.documents (id) on delete set null,
  documenso_document_id text,
  signing_url text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired', 'demo')),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_agreements_org_id_idx
  on public.vendor_agreements (org_id);
create index if not exists vendor_agreements_vendor_id_idx
  on public.vendor_agreements (vendor_id);

-- F2: white-label email basics (DKIM still per Resend domain setup)
alter table public.orgs
  add column if not exists from_email text,
  add column if not exists reply_to_email text,
  add column if not exists brand_primary_color text,
  add column if not exists logo_url text;

-- E4: API keys (hash stored; plaintext shown once)
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_org_id_idx on public.api_keys (org_id);

-- E4: outbound webhooks
create table if not exists public.outbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default '{vendor.status_changed,document.published}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbound_webhooks_org_id_idx
  on public.outbound_webhooks (org_id);

-- Team invites (G1) — email invite; accept via magic link later / founder adds by email
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member', 'viewer')),
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index if not exists org_invites_org_id_idx on public.org_invites (org_id);

alter table public.vendor_tax_profiles enable row level security;
alter table public.vendor_licenses enable row level security;
alter table public.vendor_agreements enable row level security;
alter table public.api_keys enable row level security;
alter table public.outbound_webhooks enable row level security;
alter table public.org_invites enable row level security;

create policy vendor_tax_profiles_all on public.vendor_tax_profiles for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy vendor_licenses_all on public.vendor_licenses for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy vendor_agreements_all on public.vendor_agreements for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy api_keys_all on public.api_keys for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy outbound_webhooks_all on public.outbound_webhooks for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy org_invites_all on public.org_invites for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

-- Allow members to see teammates (needed for team settings)
drop policy if exists org_members_select on public.org_members;
create policy org_members_select on public.org_members for select
  using (public.is_org_member(org_id));

create policy org_members_insert on public.org_members for insert
  with check (public.is_org_member(org_id));

create policy org_members_update on public.org_members for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
