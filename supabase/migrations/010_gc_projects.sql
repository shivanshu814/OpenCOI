-- CertShield D2: GC project mode
-- Projects with start/end, subs, project-scoped requirements, closeout pack.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  -- Optional link to a property/entity when the job is on a managed building
  property_id uuid references public.properties (id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'closeout', 'closed')),
  certificate_holder_name text,
  additional_insured_wording text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_id_idx on public.projects (org_id);
create index projects_property_id_idx on public.projects (property_id)
  where property_id is not null;

create table public.project_vendors (
  project_id uuid not null references public.projects (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, vendor_id)
);

create index project_vendors_vendor_id_idx on public.project_vendors (vendor_id);
create index project_vendors_org_id_idx on public.project_vendors (org_id);

-- Requirement sets: project scope
alter table public.requirement_sets
  drop constraint if exists requirement_sets_scope_check;

alter table public.requirement_sets
  add constraint requirement_sets_scope_check
  check (scope in ('global', 'trade', 'property', 'project'));

alter table public.requirement_sets
  add column if not exists project_id uuid references public.projects (id) on delete cascade;

create index if not exists requirement_sets_project_id_idx
  on public.requirement_sets (project_id)
  where project_id is not null;

-- Documents may be scoped to a project (job-specific cert)
alter table public.documents
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists documents_project_id_idx
  on public.documents (project_id)
  where project_id is not null;

alter table public.projects enable row level security;
alter table public.project_vendors enable row level security;

create policy projects_all on public.projects for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy project_vendors_all on public.project_vendors for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
