-- Idempotent create_org + ensure founder can bootstrap after GRANT fix.
-- If the user already has a membership, return that org (no slug clash).

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
  values (p_name, p_slug, encode(gen_random_bytes(8), 'hex'))
  on conflict (slug) do nothing
  returning id into v_org_id;

  if v_org_id is null then
    insert into public.orgs (name, slug, intake_token)
    values (
      p_name,
      p_slug || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8),
      encode(gen_random_bytes(8), 'hex')
    )
    returning id into v_org_id;
  end if;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner')
  on conflict (org_id, user_id) do nothing;

  return v_org_id;
end;
$$;

revoke all on function public.create_org(text, text) from public;
grant execute on function public.create_org(text, text) to authenticated;

-- Bootstrap org for existing logged-in founder who never got membership
-- (create_org failed earlier due to missing GRANTs).
do $$
declare
  v_uid uuid := '5bcce5c2-fdc2-4e81-ade3-db585a37b649';
  v_org_id uuid;
begin
  if not exists (select 1 from auth.users where id = v_uid) then
    return;
  end if;
  if exists (select 1 from public.org_members where user_id = v_uid) then
    return;
  end if;

  insert into public.orgs (name, slug, intake_token)
  values (
    'CertShield',
    'shivanshu814pathak-' || substr(replace(v_uid::text, '-', ''), 1, 8),
    encode(extensions.gen_random_bytes(8), 'hex')
  )
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, v_uid, 'owner');
end;
$$;
