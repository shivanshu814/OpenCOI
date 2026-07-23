-- Fix API Unauthorized: PostgREST roles lacked table privileges.
-- RLS still enforces tenant isolation; without GRANT, even valid JWTs get
-- permission denied on org_members/orgs → getSessionOrg returns null → 401.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions
  to anon, authenticated, service_role;

-- Ensure create_org stays callable after login bootstrap
grant execute on function public.create_org(text, text) to authenticated;
grant execute on function public.is_org_member(uuid) to anon, authenticated, service_role;
