-- Fix org_members SELECT: members must always see their own row.
-- Previous policy used only is_org_member(org_id), which can fail the
-- chicken/egg check in some PostgREST paths and leave APIs Unauthorized
-- even when auth.users session is valid.

drop policy if exists org_members_select on public.org_members;

create policy org_members_select on public.org_members for select
  using (user_id = auth.uid() or public.is_org_member(org_id));
