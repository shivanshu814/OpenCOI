-- Week 2 B1: tokenized email-in — {token}@in.certshield.com maps to org.
-- Postmark inbound webhook resolves token → org; fuzzy-matches vendor.

alter table public.orgs
  add column if not exists intake_token text;

update public.orgs
set intake_token = encode(gen_random_bytes(8), 'hex')
where intake_token is null;

alter table public.orgs
  alter column intake_token set not null;

create unique index if not exists orgs_intake_token_uidx
  on public.orgs (intake_token);

-- Service-role lookups by token (webhook); members can read their org token.
-- orgs_select already covers SELECT for members.

create or replace function public.create_org(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.orgs (name, slug, intake_token)
  values (p_name, p_slug, encode(gen_random_bytes(8), 'hex'))
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return v_org_id;
end;
$$;

revoke all on function public.create_org(text, text) from public;
grant execute on function public.create_org(text, text) to authenticated;
