-- 024: Extend Supabase Realtime to every table that drives a workspace screen.
--
-- 018 added only `documents`, so a change to a vendor, a compliance check, an
-- agent confirmation, a property, a project or a chase email produced no
-- client event at all — the user had to reload the page to see their own
-- write land. That is the "I have to refresh to see it" report.
--
-- Safety:
-- * RLS is enforced by Realtime for postgres_changes — a client only receives
--   rows its org can already read, so this widens liveness, not visibility.
--   No policy is added, changed, or relaxed here.
-- * Idempotent per table: skips anything already in the publication (018's
--   `documents` entry is left alone).
-- * The app stays fail-soft: if this migration is not applied, subscriptions
--   receive nothing and the existing refresh paths still work.
--
-- Deliberately EXCLUDED, and why:
-- * vendor_portal_tokens, api_keys — token/secret material. Realtime payloads
--   carry column values, so a broadcast row is a copy of the secret leaving
--   the database. These surfaces show a one-time value at creation instead.
-- * vendor_tax_profiles — encrypted TIN/SSN. Same reasoning; the panel that
--   shows it is admin-gated and masked server-side.
-- * extractions — raw AI payloads, large and per-document; the `documents`
--   row already changes on every pipeline transition, which is what the UI
--   actually renders.
-- * audit_events — append-only and high volume; the trail is read on demand,
--   and streaming every event to every open tab is cost without a screen.

do $$
declare
  t text;
  live_tables text[] := array[
    'vendors',              -- status pills, vendor list/detail, dashboard counts
    'compliance_checks',    -- verdict lines on review + vendor detail
    'agent_confirmations',  -- producer confirm/deny landing back in the UI
    'properties',           -- portfolio list, owner reports, per-property reqs
    'projects',             -- GC project list/detail
    'property_vendors',     -- which vendors are attached to a property
    'project_vendors',      -- ditto for projects
    'requirement_sets',     -- rule edits must re-render dependent verdicts
    'chase_sequences',      -- chase cadence state on vendor detail
    'messages',             -- unified email/SMS/portal thread
    'vendor_agreements',    -- e-sign status
    'vendor_licenses',      -- license expiry
    'org_members',          -- team list + a role change taking effect live
    'org_invites',          -- pending invite list
    'orgs',                 -- workspace name, branding, notification prefs
    'support_chat_messages' -- F4 portal chat mirrored to the customer view
  ];
begin
  foreach t in array live_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', t
      );
    end if;
  end loop;
end $$;
