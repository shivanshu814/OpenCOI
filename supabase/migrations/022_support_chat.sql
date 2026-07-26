-- 022: F4 — AI support chat on the no-login vendor portal (P12).
--
-- Vendors receive findings like "CG 20 37 additional insured (completed ops):
-- endorsement form not attached" and have no idea what to do next, so they do
-- nothing — the real reason chases go unanswered. The portal chat explains a
-- published finding and names the next document, in English or Spanish.
--
-- Every turn is persisted because:
--   * the property manager must be able to see what their vendor was told
--     (support quality, and disputes about "your system told me X");
--   * CLAUDE.md rule 5 requires model version / cost / latency logged on every
--     AI call, and this is an AI call;
--   * the hourly per-vendor rate limit counts from this table — no extra
--     infrastructure, and the counter survives a redeploy.
--
-- Writes go through the service role (the vendor has no auth session — the
-- magic-link token is resolved server-side). Org members get read-only access;
-- there is no customer-facing edit path, and a transcript that could be
-- rewritten after the fact would be worthless as evidence.

create table if not exists public.support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  role text not null check (role in ('vendor', 'assistant')),
  content text not null,
  locale text not null default 'en' check (locale in ('en', 'es')),
  -- Null on vendor turns; required in spirit on assistant turns (the AI call).
  model_version text,
  prompt_version text,
  cost_usd numeric(10, 6),
  latency_ms int,
  created_at timestamptz not null default now()
);

create index if not exists support_chat_messages_vendor_idx
  on public.support_chat_messages (org_id, vendor_id, created_at desc);

-- Rate-limit counter reads (vendor turns in the last hour).
create index if not exists support_chat_messages_recent_idx
  on public.support_chat_messages (vendor_id, created_at desc);

alter table public.support_chat_messages enable row level security;

-- Read-only for the org that owns the vendor. Service role bypasses RLS.
create policy support_chat_messages_select on public.support_chat_messages
  for select using (public.is_org_member(org_id));
