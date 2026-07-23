-- Week 4: SMS/TCPA, agent confirmations (B8), fraud signals (B7), digest prefs.
-- Carrier ratings (B6) use static TS dataset (refreshable); optional org floor below.

alter table public.vendors
  add column if not exists sms_opt_in_at timestamptz,
  add column if not exists sms_opt_in_source text,
  add column if not exists sms_opt_out_at timestamptz;

alter table public.messages
  add column if not exists to_phone text;

alter table public.documents
  add column if not exists fraud_signals jsonb not null default '[]'::jsonb;

alter table public.orgs
  add column if not exists min_carrier_rating text not null default 'A-',
  add column if not exists digest_email text,
  add column if not exists digest_enabled boolean not null default true;

-- B8: producer Confirm/Deny signed links
create table if not exists public.agent_confirmations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  token_hash text not null unique,
  producer_email text not null,
  producer_name text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'denied', 'expired', 'revoked')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  response_note text,
  created_at timestamptz not null default now()
);

create index if not exists agent_confirmations_org_id_idx
  on public.agent_confirmations (org_id);
create index if not exists agent_confirmations_document_id_idx
  on public.agent_confirmations (document_id);
create index if not exists agent_confirmations_pending_idx
  on public.agent_confirmations (org_id, status)
  where status = 'pending';

alter table public.agent_confirmations enable row level security;

create policy agent_confirmations_all on public.agent_confirmations for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
