-- CertShield post-W6: owner reports (D3 / P10)
-- Owner email + opt-in per property for monthly branded PDF/email.

alter table public.properties
  add column if not exists owner_report_email text,
  add column if not exists owner_report_enabled boolean not null default false;

comment on column public.properties.owner_report_email is
  'Building owner recipient for monthly D3 owner compliance report';
comment on column public.properties.owner_report_enabled is
  'When true, monthly Inngest job emails owner_report_email';
