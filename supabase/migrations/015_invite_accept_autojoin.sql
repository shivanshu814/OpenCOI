-- G1 invite accept → auto-join. A newly signed-up invitee is not yet a member
-- of the inviting org, so org_invites RLS (is_org_member) intentionally hides
-- their pending invite. Rather than widen that policy (which would leak invite
-- rows across orgs), we resolve the invite through a SECURITY DEFINER function
-- that only ever acts on invites addressed to the *caller's own* verified email.
--
-- Called from getSessionOrg() on every login, BEFORE create_org, so invitees
-- join the inviting org instead of bootstrapping a separate one.

create or replace function public.claim_pending_invites()
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_org_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Trust the email on the auth record, not client input.
  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    return null;
  end if;

  -- Accept every pending invite addressed to this email (case-insensitive).
  -- Existing membership wins on conflict; role comes from the invite.
  for v_org_id in
    select i.org_id
    from public.org_invites i
    where lower(i.email) = lower(v_email)
      and i.accepted_at is null
      and not exists (
        select 1 from public.org_members m
        where m.org_id = i.org_id and m.user_id = v_uid
      )
    order by i.created_at asc
  loop
    insert into public.org_members (org_id, user_id, role)
    select v_org_id, v_uid, i.role
    from public.org_invites i
    where i.org_id = v_org_id and lower(i.email) = lower(v_email)
    limit 1
    on conflict (org_id, user_id) do nothing;
  end loop;

  -- Stamp accepted_at for anything now backed by a membership.
  update public.org_invites i
  set accepted_at = now()
  where lower(i.email) = lower(v_email)
    and i.accepted_at is null
    and exists (
      select 1 from public.org_members m
      where m.org_id = i.org_id and m.user_id = v_uid
    );

  -- Return the earliest org the caller is now a member of via an invite, if any.
  select m.org_id into v_org_id
  from public.org_members m
  join public.org_invites i
    on i.org_id = m.org_id and lower(i.email) = lower(v_email)
  where m.user_id = v_uid
  order by i.created_at asc
  limit 1;

  return v_org_id;
end;
$$;

revoke all on function public.claim_pending_invites() from public;
grant execute on function public.claim_pending_invites() to authenticated;
