-- 018: Supabase Realtime (free/inbuilt) for the review pipeline.
--
-- Adds `documents` to the default `supabase_realtime` publication so the app
-- can subscribe to extraction/pipeline status changes (review queue,
-- dashboard) instead of relying only on polling.
--
-- Safety:
-- * RLS is enforced by Realtime for postgres_changes — clients only receive
--   rows their org can already read. No policy changes here.
-- * Idempotent: skips if the table is already in the publication.
-- * App is fail-soft: if this migration is not applied, the subscription
--   simply receives nothing and existing polling/manual refresh still works.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end $$;
