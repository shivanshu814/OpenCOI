-- Audit request metadata: IP + user-agent for who-did-what forensics (P7).
-- Append-only table stays append-only; new columns are nullable (old rows show "—").
-- actor_email captured at write time so admins can see email without auth.users joins.

alter table public.audit_events
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists actor_email text;

comment on column public.audit_events.ip_address is
  'Client IP from x-forwarded-for / x-real-ip at insert time; null for system/background jobs.';
comment on column public.audit_events.user_agent is
  'Client User-Agent at insert time; null for system/background jobs.';
comment on column public.audit_events.actor_email is
  'Actor email when known at insert (session user); null for system/vendor tokens.';
