-- Week 2: Paddle subscriptions + onboarding wizard state (docs/01 §0 / §9)

alter table public.orgs
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists plan text
    check (plan is null or plan in ('starter', 'pro', 'business')),
  add column if not exists paddle_customer_id text,
  add column if not exists paddle_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs (id) on delete set null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text,
  plan text check (plan is null or plan in ('starter', 'pro', 'business')),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_org_id_idx on public.subscriptions (org_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions for select
  using (org_id is not null and public.is_org_member(org_id));

-- Service role / webhook uses admin client (bypasses RLS) for upserts.

-- Allow org owners/admins to update own org profile during onboarding
create policy orgs_update on public.orgs for update
  using (public.is_org_member(id))
  with check (public.is_org_member(id));
