-- Storage policies for private bucket `cois`, golden-set stub, org bootstrap.
-- Create the bucket in Dashboard first (private), then run this migration.

-- ---------------------------------------------------------------------------
-- Org bootstrap (chicken/egg: no membership until org exists)
-- ---------------------------------------------------------------------------
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

  insert into public.orgs (name, slug)
  values (p_name, p_slug)
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return v_org_id;
end;
$$;

revoke all on function public.create_org(text, text) from public;
grant execute on function public.create_org(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Golden-set regression cases (Appendix B: corrections → golden set)
-- ---------------------------------------------------------------------------
create table public.golden_set_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  field_path text not null,
  before_value jsonb,
  after_value jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index golden_set_cases_org_id_idx on public.golden_set_cases (org_id);
create index golden_set_cases_document_id_idx on public.golden_set_cases (document_id);

alter table public.golden_set_cases enable row level security;

create policy golden_set_cases_select on public.golden_set_cases for select
  using (public.is_org_member(org_id));

create policy golden_set_cases_insert on public.golden_set_cases for insert
  with check (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket `cois` — path {org_id}/{vendor_id}/{doc_id}.pdf
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cois',
  'cois',
  false,
  20971520,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

create policy cois_select on storage.objects for select
  using (
    bucket_id = 'cois'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy cois_insert on storage.objects for insert
  with check (
    bucket_id = 'cois'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy cois_update on storage.objects for update
  using (
    bucket_id = 'cois'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy cois_delete on storage.objects for delete
  using (
    bucket_id = 'cois'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );
