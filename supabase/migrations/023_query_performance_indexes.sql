-- 023: composite indexes for the app's actual hot-path query shapes.
--
-- Every index here was derived from a query that exists in src/lib today, not
-- from a guess. The pattern is always the same because every table is
-- org-scoped and RLS filters on org_id first: lead with org_id (or with the
-- join key when the query filters on it directly), then the equality columns,
-- then the ORDER BY column in its sort direction so Postgres can read the
-- rows out already ordered instead of sorting a whole partition per request.
--
-- RLS is untouched. An index changes only how Postgres *finds* rows; the
-- `is_org_member(org_id)` policies still decide which rows a caller may see,
-- and none of these indexes is a view, a SECURITY DEFINER function, or a grant.
-- Leading with org_id in fact aligns the physical access path with the tenant
-- boundary the policies already enforce.
--
-- `create index concurrently` is deliberately NOT used: Supabase runs each
-- migration file inside a transaction, and CONCURRENTLY cannot run in one.
-- Every table here is small enough that the brief SHARE lock is a non-event;
-- revisit with a manual CONCURRENTLY build if any table passes ~1M rows.
--
-- Migration 019 already added:
--   vendors (org_id, status), vendors (org_id, name), the three vendor trigram
--   indexes, audit_events (org_id, created_at desc),
--   documents (org_id, status, created_at desc).
-- Nothing below duplicates those.

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

-- Serves, all of which filter org + vendor and read newest-first:
--   listVendorDocuments()            src/lib/data/documents.ts
--   loadComplianceReport()           src/lib/reports/load.ts  (latest doc)
--   listVendorAuditTrail()           src/lib/audit/list.ts    (vendor's doc ids)
--   loadOwnerReport()                src/lib/reports/owner-load.ts (.in vendor_id)
--   GET /api/vendors/[id]/litigation-pack
-- Previously the planner had to bitmap-AND documents_org_id_idx with
-- documents_vendor_id_idx and then sort — this reads straight off the index.
create index if not exists documents_org_vendor_created_idx
  on public.documents (org_id, vendor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- extractions
-- ---------------------------------------------------------------------------

-- "Latest extraction for this document" — the per-document lookup behind every
-- review-detail render and the batched review-queue hydration
-- (hydrateDocuments() in src/lib/data/documents.ts), plus chase/send.ts.
-- extractions_document_id_idx alone forced a sort of every attempt per doc.
create index if not exists extractions_document_created_idx
  on public.extractions (document_id, created_at desc);

-- Admin health page: last 100 AI reads for the org, newest-first
-- (src/app/app/(workspace)/admin/page.tsx). There was no org_id index at all
-- on this table, so that page scanned and sorted every extraction row.
create index if not exists extractions_org_created_idx
  on public.extractions (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- compliance_checks
-- ---------------------------------------------------------------------------

-- "Latest check for this document" and its batched `.in(document_id, [...])`
-- form: hydrateDocuments(), listVendorDocuments(), loadComplianceReport().
create index if not exists compliance_checks_document_created_idx
  on public.compliance_checks (document_id, created_at desc);

-- Latest published check for a vendor — loadPublishedGaps()
-- (src/lib/portal/support-context.ts), which every vendor-portal chat turn
-- runs, and the litigation pack's verdict history.
create index if not exists compliance_checks_org_vendor_created_idx
  on public.compliance_checks (org_id, vendor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------

-- Entity-scoped trails read newest-first:
--   listVendorAuditTrail()   .eq(entity_type).eq/in(entity_id)
--   litigation pack          .eq(entity_id)   -- no entity_type predicate
-- entity_id leads (it is the selective column) so both shapes are served;
-- entity_type then filters cheaply on the already-narrow result. The existing
-- audit_events_entity_idx lacks org_id and created_at, so it could not avoid
-- the sort that a 300-row `limit` still had to pay for.
create index if not exists audit_events_org_entity_created_idx
  on public.audit_events (org_id, entity_id, created_at desc);

-- The audit page's action / actor chips (listAuditEvents opts.action,
-- opts.actorType). Without these, filtering falls back to
-- audit_events_org_created_idx and discards most of what it reads.
create index if not exists audit_events_org_action_created_idx
  on public.audit_events (org_id, action, created_at desc);

create index if not exists audit_events_org_actor_created_idx
  on public.audit_events (org_id, actor_type, created_at desc);

-- ---------------------------------------------------------------------------
-- vendors
-- ---------------------------------------------------------------------------

-- The vendors page filters by a status chip AND orders by name. 019 has
-- (org_id, status) and (org_id, name) separately; neither can do both, so a
-- status-filtered page still sorted its whole matching set on every render.
-- This one index answers filter + sort + paging in a single ordered scan.
-- (It also covers everything vendors_org_status_idx covers, as its prefix.)
create index if not exists vendors_org_status_name_idx
  on public.vendors (org_id, status, name);

-- ---------------------------------------------------------------------------
-- properties / projects
-- ---------------------------------------------------------------------------

-- Properties list and the reports page both order by name within an org.
create index if not exists properties_org_name_idx
  on public.properties (org_id, name);

-- Projects list orders by created_at desc within an org.
create index if not exists projects_org_created_idx
  on public.projects (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- join tables
-- ---------------------------------------------------------------------------

-- listOwnerReportRows() / loadOwnerReport() / property detail all read
-- vendor_id filtered by (org_id, property_id). Including vendor_id makes this
-- an index-only scan — the heap is never touched for the membership lookup.
-- The primary key is (property_id, vendor_id), which cannot serve an
-- org-leading scan.
create index if not exists property_vendors_org_property_vendor_idx
  on public.property_vendors (org_id, property_id, vendor_id);

-- Same shape for project detail and the closeout pack.
create index if not exists project_vendors_org_project_vendor_idx
  on public.project_vendors (org_id, project_id, vendor_id);

-- ---------------------------------------------------------------------------
-- messages / golden set
-- ---------------------------------------------------------------------------

-- Litigation pack reads a vendor's message history newest-first. The existing
-- messages_created_at_idx is (org_id, created_at desc) — it cannot skip other
-- vendors' messages, so this scanned the org's whole outbound history.
create index if not exists messages_org_vendor_created_idx
  on public.messages (org_id, vendor_id, created_at desc);

-- Admin page reads the org's most recent golden-set corrections (limit 1000).
-- Only (org_id) and (document_id) existed, so this sorted the full set.
create index if not exists golden_set_cases_org_created_idx
  on public.golden_set_cases (org_id, created_at desc);
