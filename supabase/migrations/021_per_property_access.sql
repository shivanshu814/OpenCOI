-- 021: G1 — per-property access scoping.
--
-- Roles were org-wide only: a Manager at a firm running 40 buildings could see
-- all 40. Larger customers need a regional manager who sees their own
-- properties and nothing else.
--
-- Design: **opt-in restriction, not opt-in access.**
--   * A member with NO rows in `property_access` keeps full org-wide access.
--     Every existing user therefore behaves exactly as before this migration —
--     no silent lockout on deploy, which is the failure mode that makes
--     access-control changes dangerous.
--   * Adding even one row flips that member to restricted: they then see only
--     the properties listed for them.
--   * Owners and admins are never restricted. Someone must always be able to
--     administer the org and repair a misconfigured scope.

create table if not exists public.property_access (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (property_id, user_id)
);

create index if not exists property_access_user_org_idx
  on public.property_access (user_id, org_id);
create index if not exists property_access_property_idx
  on public.property_access (property_id);

alter table public.property_access enable row level security;

/**
 * True when the caller's view of this org is limited to specific properties.
 *
 * SECURITY DEFINER so the check itself is not subject to the policies it
 * informs (a policy that queried a protected table would recurse). `search_path`
 * is pinned per Supabase's linter guidance.
 */
create or replace function public.is_property_scoped(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Admins are never scoped: the org must stay administrable.
    not exists (
      select 1 from public.org_members m
      where m.org_id = p_org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
    and exists (
      select 1 from public.property_access a
      where a.org_id = p_org_id and a.user_id = auth.uid()
    );
$$;

/** True when the caller may see this specific property. */
create or replace function public.can_access_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and public.is_org_member(p.org_id)
      and (
        not public.is_property_scoped(p.org_id)
        or exists (
          select 1 from public.property_access a
          where a.property_id = p.id and a.user_id = auth.uid()
        )
      )
  );
$$;

-- Only admins manage who is scoped to what; members may read their own grants
-- so the UI can show them which properties they hold.
create policy property_access_select on public.property_access for select
  using (
    public.is_org_member(org_id)
    and (user_id = auth.uid() or public.is_org_admin(org_id))
  );

create policy property_access_write on public.property_access for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- Enforce the scope on property reads. Writes already require is_org_writer /
-- is_org_admin from migration 016 and are left untouched.
--
-- RLS policies are OR'd, so a leftover permissive `*_all` policy would defeat
-- the scope entirely. Migration 014 dropped these; re-dropping is free
-- insurance for any environment that drifted.
drop policy if exists properties_all on public.properties;
drop policy if exists property_vendors_all on public.property_vendors;
drop policy if exists properties_select on public.properties;
create policy properties_select on public.properties for select
  using (
    public.is_org_member(org_id)
    and (
      not public.is_property_scoped(org_id)
      or exists (
        select 1 from public.property_access a
        where a.property_id = properties.id and a.user_id = auth.uid()
      )
    )
  );

-- The property↔vendor join must follow the same scope, or a restricted user
-- could enumerate out-of-scope properties by their ids.
drop policy if exists property_vendors_select on public.property_vendors;
create policy property_vendors_select on public.property_vendors for select
  using (
    public.is_org_member(org_id)
    and public.can_access_property(property_id)
  );

comment on table public.property_access is
  'G1 per-property scoping. No rows for a member = full org access (default). Any row = restricted to the listed properties. Owners/admins are never restricted.';

grant execute on function public.is_property_scoped(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_property(uuid)
  to authenticated, service_role;
