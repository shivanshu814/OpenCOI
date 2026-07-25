-- 016: Security harden — role-aware RLS, billing column protection,
--       extraction_failed status, longer intake tokens.
-- Product review 2026-07-25 P0/P1.

-- ---------------------------------------------------------------------------
-- Appendix B operational status: extraction permanently failed (pre-review).
-- ---------------------------------------------------------------------------
alter type public.document_pipeline_status add value if not exists 'extraction_failed';

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER, search_path pinned)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_writer(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'member')
  );
$$;

grant execute on function public.is_org_admin(uuid) to authenticated, service_role;
grant execute on function public.is_org_writer(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- org_members: only admins may insert/update (blocks self-elevation)
-- ---------------------------------------------------------------------------
drop policy if exists org_members_insert on public.org_members;
drop policy if exists org_members_update on public.org_members;

create policy org_members_insert on public.org_members for insert
  with check (public.is_org_admin(org_id));

create policy org_members_update on public.org_members for update
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- orgs_update: members can still update branding, but a trigger freezes
-- billing columns unless the caller is service_role (Paddle webhook).
-- ---------------------------------------------------------------------------
create or replace function public.protect_org_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if jwt_role = 'service_role' then
    return new;
  end if;

  new.plan := old.plan;
  new.paddle_customer_id := old.paddle_customer_id;
  new.paddle_subscription_id := old.paddle_subscription_id;
  new.subscription_status := old.subscription_status;
  return new;
end;
$$;

drop trigger if exists protect_org_billing_columns_trg on public.orgs;
create trigger protect_org_billing_columns_trg
  before update on public.orgs
  for each row
  execute function public.protect_org_billing_columns();

-- ---------------------------------------------------------------------------
-- Core write policies: viewers read-only at the DB layer
-- ---------------------------------------------------------------------------
drop policy if exists vendors_all on public.vendors;
create policy vendors_select on public.vendors for select
  using (public.is_org_member(org_id));
create policy vendors_insert on public.vendors for insert
  with check (public.is_org_writer(org_id));
create policy vendors_update on public.vendors for update
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));
create policy vendors_delete on public.vendors for delete
  using (public.is_org_admin(org_id));

drop policy if exists documents_all on public.documents;
create policy documents_select on public.documents for select
  using (public.is_org_member(org_id));
create policy documents_insert on public.documents for insert
  with check (public.is_org_writer(org_id));
create policy documents_update on public.documents for update
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));
create policy documents_delete on public.documents for delete
  using (public.is_org_admin(org_id));

drop policy if exists requirement_sets_all on public.requirement_sets;
create policy requirement_sets_select on public.requirement_sets for select
  using (public.is_org_member(org_id));
create policy requirement_sets_write on public.requirement_sets for all
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));

-- Sensitive: API keys / webhooks / invites — admin only
drop policy if exists api_keys_all on public.api_keys;
create policy api_keys_select on public.api_keys for select
  using (public.is_org_admin(org_id));
create policy api_keys_write on public.api_keys for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists outbound_webhooks_all on public.outbound_webhooks;
create policy outbound_webhooks_select on public.outbound_webhooks for select
  using (public.is_org_admin(org_id));
create policy outbound_webhooks_write on public.outbound_webhooks for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

drop policy if exists org_invites_all on public.org_invites;
create policy org_invites_select on public.org_invites for select
  using (public.is_org_admin(org_id));
create policy org_invites_write on public.org_invites for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- Tax profiles: admin for TIN write sensitivity; writers can read
drop policy if exists vendor_tax_profiles_all on public.vendor_tax_profiles;
create policy vendor_tax_profiles_select on public.vendor_tax_profiles for select
  using (public.is_org_member(org_id));
create policy vendor_tax_profiles_write on public.vendor_tax_profiles for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- ---------------------------------------------------------------------------
-- Shrink anon blast radius (RLS still applies; privilege least-privilege)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
-- Auth helpers still needed for login flows; no table DML for anon.

drop policy if exists properties_insert on public.properties;
drop policy if exists properties_update on public.properties;
drop policy if exists properties_delete on public.properties;
create policy properties_insert on public.properties for insert
  with check (public.is_org_writer(org_id));
create policy properties_update on public.properties for update
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));
create policy properties_delete on public.properties for delete
  using (public.is_org_admin(org_id));

drop policy if exists property_vendors_insert on public.property_vendors;
drop policy if exists property_vendors_update on public.property_vendors;
drop policy if exists property_vendors_delete on public.property_vendors;
create policy property_vendors_insert on public.property_vendors for insert
  with check (public.is_org_writer(org_id));
create policy property_vendors_update on public.property_vendors for update
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));
create policy property_vendors_delete on public.property_vendors for delete
  using (public.is_org_admin(org_id));

drop policy if exists projects_all on public.projects;
create policy projects_select on public.projects for select
  using (public.is_org_member(org_id));
create policy projects_write on public.projects for all
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));

drop policy if exists project_vendors_all on public.project_vendors;
create policy project_vendors_select on public.project_vendors for select
  using (public.is_org_member(org_id));
create policy project_vendors_write on public.project_vendors for all
  using (public.is_org_writer(org_id))
  with check (public.is_org_writer(org_id));

-- ---------------------------------------------------------------------------
-- Longer intake tokens for new orgs (existing rows unchanged)
-- ---------------------------------------------------------------------------
create or replace function public.create_org(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org_id uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select org_id into v_existing
  from public.org_members
  where user_id = auth.uid()
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.orgs (name, slug, intake_token)
  values (p_name, p_slug, encode(gen_random_bytes(16), 'hex'))
  on conflict (slug) do nothing
  returning id into v_org_id;

  if v_org_id is null then
    insert into public.orgs (name, slug, intake_token)
    values (
      p_name,
      p_slug || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8),
      encode(gen_random_bytes(16), 'hex')
    )
    returning id into v_org_id;
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner')
  on conflict (org_id, user_id) do nothing;

  return v_org_id;
end;
$$;
