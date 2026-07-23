-- Repair properties RLS (SELECT empty + INSERT denied for authenticated members).
-- Recreate policies to match projects/vendors pattern.

drop policy if exists properties_all on public.properties;
drop policy if exists property_vendors_all on public.property_vendors;

create policy properties_select on public.properties for select
  using (public.is_org_member(org_id));

create policy properties_insert on public.properties for insert
  with check (public.is_org_member(org_id));

create policy properties_update on public.properties for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy properties_delete on public.properties for delete
  using (public.is_org_member(org_id));

create policy property_vendors_select on public.property_vendors for select
  using (public.is_org_member(org_id));

create policy property_vendors_insert on public.property_vendors for insert
  with check (public.is_org_member(org_id));

create policy property_vendors_update on public.property_vendors for update
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy property_vendors_delete on public.property_vendors for delete
  using (public.is_org_member(org_id));

-- Ensure table privileges (belt + suspenders after 012)
grant select, insert, update, delete on public.properties to authenticated, service_role;
grant select, insert, update, delete on public.property_vendors to authenticated, service_role;
