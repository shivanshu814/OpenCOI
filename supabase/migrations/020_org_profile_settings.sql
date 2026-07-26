-- 020: organization profile + notification preferences.
--
-- Settings previously exposed only white-label email/brand fields. Customers
-- need their own company identity (the name and address that appear on owner
-- reports and vendor-facing emails) and explicit control over which channels
-- CertShield may notify them on.

alter table public.orgs
  add column if not exists legal_name text,
  add column if not exists address_line text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists phone text,
  add column if not exists website text,
  -- IANA zone (e.g. "America/New_York"). Drives digest send time and the
  -- date wording on reports so a US customer never sees a UTC-shifted day.
  add column if not exists timezone text,
  -- Notification channels. Email is the only live channel today; SMS ships
  -- once Twilio A2P registration is approved, so it stays off and is shown
  -- as "coming soon" in the UI rather than pretending to be configurable.
  add column if not exists notify_email_enabled boolean not null default true,
  add column if not exists notify_sms_enabled boolean not null default false;
