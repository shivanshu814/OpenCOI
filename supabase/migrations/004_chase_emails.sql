-- Week 2 C2: chase sequences + outbound messages (EN/ES via Resend).

alter table public.vendors
  add column if not exists agent_email text;

alter table public.orgs
  add column if not exists chase_notify_email text;

create table if not exists public.chase_sequences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  reason text not null check (reason in ('expiry', 'missing_docs')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled')),
  earliest_expiration_date date,
  attempts int not null default 0,
  max_attempts int not null default 8,
  last_template_key text,
  last_sent_at timestamptz,
  paused_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chase_sequences_org_id_idx
  on public.chase_sequences (org_id);
create index if not exists chase_sequences_vendor_id_idx
  on public.chase_sequences (vendor_id);
create index if not exists chase_sequences_active_idx
  on public.chase_sequences (org_id, status)
  where status in ('active', 'paused');

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  chase_sequence_id uuid references public.chase_sequences (id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  direction text not null check (direction in ('outbound', 'inbound')),
  template_key text,
  locale text check (locale in ('en', 'es')),
  to_email text,
  cc_emails text[] not null default '{}',
  subject text,
  body_text text,
  provider text,
  provider_message_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'demo', 'received')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_org_id_idx on public.messages (org_id);
create index if not exists messages_vendor_id_idx on public.messages (vendor_id);
create index if not exists messages_created_at_idx
  on public.messages (org_id, created_at desc);

alter table public.chase_sequences enable row level security;
alter table public.messages enable row level security;

create policy chase_sequences_all on public.chase_sequences for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy messages_all on public.messages for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
