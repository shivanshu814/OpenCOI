import {
  countByKey,
  firstByKey,
  groupByKey,
  uniqueKeys,
} from "@/lib/data/join";
import type { VendorStatus } from "@/lib/data/types";
import {
  escapeHtml,
  listHtml,
  paragraphHtml,
  renderBrandedEmailHtml,
} from "@/lib/email/layout";
import { sendOutboundEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditEvent } from "@/lib/audit/write";
import { buildOwnerReport } from "./owner-build";
import { loadOwnerReport } from "./owner-load";
import {
  ownerReportFilename,
  renderOwnerReportPdf,
} from "./owner-pdf";
import type { OwnerReport } from "./types";

export function ownerReportEmailBodies(report: OwnerReport): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `${report.property.name} owner report — ${report.period_label} (${report.compliance_percent}% covered)`;
  const text = [
    `Owner compliance report — ${report.property.name}`,
    `Period: ${report.period_label}`,
    `Prepared by: ${report.org_name}`,
    "",
    report.summary,
    "",
    `Compliance %: ${report.compliance_percent}`,
    `Documents on file: ${report.documents_on_file}`,
    `Risks flagged (before assignment): ${report.risks_flagged}`,
    `Expiring ≤30d: ${report.expiring_count}`,
    "",
    report.honesty_note,
    "",
    report.disclaimer,
  ].join("\n");

  const html = renderBrandedEmailHtml({
    preheader: `${report.property.name} — ${report.period_label} · ${report.compliance_percent}% covered`,
    heading: "Owner compliance report",
    bodyHtml: [
      paragraphHtml(
        `<strong style="color:#121b29;">${escapeHtml(report.property.name)}</strong> · ${escapeHtml(report.period_label)}<br />Prepared by ${escapeHtml(report.org_name)}`,
      ),
      paragraphHtml(escapeHtml(report.summary)),
      listHtml([
        `Compliance %: <strong style="color:#121b29;">${report.compliance_percent}%</strong>`,
        `Documents on file: <strong style="color:#121b29;">${report.documents_on_file}</strong>`,
        `Risks flagged: <strong style="color:#121b29;">${report.risks_flagged}</strong>`,
        `Expiring ≤30d: <strong style="color:#121b29;">${report.expiring_count}</strong>`,
      ]),
    ].join("\n"),
    footerNote: `${escapeHtml(report.honesty_note)}<br /><br />${escapeHtml(report.disclaimer)}`,
  });

  return { subject, text, html };
}

/** Session-scoped: load report + email to a recipient (manual send from UI). */
export async function sendOwnerReportEmail(input: {
  propertyId: string;
  to: string;
  report?: OwnerReport;
}): Promise<{ ok: boolean; demo?: boolean; reason?: string; filename?: string }> {
  const report = input.report ?? (await loadOwnerReport(input.propertyId));
  if (!report) return { ok: false, reason: "Property not found" };

  const to = input.to.trim();
  if (!to) return { ok: false, reason: "No owner report email" };

  const { subject, text, html } = ownerReportEmailBodies(report);
  const send = await sendOutboundEmail({
    to,
    subject,
    text,
    html,
    tags: [{ name: "template", value: "owner_monthly_report" }],
  });

  if (!send.ok) return { ok: false, reason: send.error };

  return {
    ok: true,
    demo: false,
    filename: ownerReportFilename(report),
  };
}

/**
 * Service-role path for Inngest monthly cron — no session.
 * Emails properties with owner_report_enabled + owner_report_email.
 */
export async function sendMonthlyOwnerReportsForOrg(orgId: string): Promise<{
  ok: boolean;
  sent: number;
  skipped: number;
  failed: number;
  demo?: boolean;
}> {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("orgs")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return { ok: false, sent: 0, skipped: 0, failed: 0 };

  const { data: properties } = await supabase
    .from("properties")
    .select(
      "id, name, address_line, city, state, postal_code, owner_llc_names, certificate_holder_name, owner_report_email, owner_report_enabled",
    )
    .eq("org_id", orgId)
    .eq("owner_report_enabled", true);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const propertyRows = properties ?? [];

  // Previously this loop issued three queries **per property**: links, vendors,
  // then documents. An org with 40 buildings paid 120 round trips before the
  // first email left. Everything the loop needs is org-scoped, so it is read
  // once up front and joined in memory per property below.
  const [{ data: allLinks }, { data: allVendors }, { data: allDocs }] =
    await Promise.all([
      supabase
        .from("property_vendors")
        .select("property_id, vendor_id")
        .eq("org_id", orgId),
      supabase
        .from("vendors")
        .select("id, name, trade, status")
        .eq("org_id", orgId),
      supabase
        .from("documents")
        // Counting only — `id` was fetched and thrown away.
        .select("vendor_id")
        .eq("org_id", orgId),
    ]);

  const linksByProperty = groupByKey(
    allLinks ?? [],
    (l) => l.property_id as string,
  );
  const vendorById = firstByKey(allVendors ?? [], (v) => v.id as string);
  const docCountByVendor = countByKey(
    allDocs ?? [],
    (d) => d.vendor_id as string,
  );

  for (const property of propertyRows) {
    const to = (property.owner_report_email as string | null)?.trim();
    if (!to) {
      skipped += 1;
      continue;
    }

    const vendorIds = uniqueKeys(
      linksByProperty.get(property.id as string) ?? [],
      (l) => l.vendor_id as string,
    );

    const vendors: {
      id: string;
      name: string;
      trade: string | null;
      status: VendorStatus;
      documents_on_file: number;
    }[] = vendorIds.flatMap((vid) => {
      const v = vendorById.get(vid);
      // A link whose vendor row is gone is skipped rather than reported as an
      // unnamed vendor — an owner report must not invent a roster entry.
      if (!v) return [];
      return [{
        id: v.id as string,
        name: v.name as string,
        trade: v.trade as string | null,
        status: v.status as VendorStatus,
        documents_on_file: docCountByVendor.get(vid) ?? 0,
      }];
    });

    const report = buildOwnerReport({
      orgName: org.name,
      property: {
        id: property.id,
        name: property.name,
        address_line: property.address_line,
        city: property.city,
        state: property.state,
        postal_code: property.postal_code,
        owner_llc_names: Array.isArray(property.owner_llc_names)
          ? (property.owner_llc_names as string[])
          : [],
        certificate_holder_name: property.certificate_holder_name,
      },
      vendors,
    });

    const { subject, text, html } = ownerReportEmailBodies(report);
    const send = await sendOutboundEmail({
      to,
      subject,
      text,
      html,
      tags: [{ name: "template", value: "owner_monthly_report" }],
    });

    if (!send.ok) {
      failed += 1;
      continue;
    }
    sent += 1;

    await insertAuditEvent(supabase, {
      org_id: orgId,
      actor_type: "system",
      actor_id: "owner_report:monthly",
      entity_type: "property",
      entity_id: property.id,
      action: "owner_report_sent",
      after_state: {
        to,
        compliance_percent: report.compliance_percent,
        risks_flagged: report.risks_flagged,
        documents_on_file: report.documents_on_file,
        transport: send.transport,
      },
    }, { captureRequest: false });
  }

  return {
    ok: failed === 0,
    sent,
    skipped,
    failed,
  };
}

export async function renderOwnerReportPdfBytes(
  propertyId: string,
): Promise<{ bytes: Uint8Array; filename: string; report: OwnerReport } | null> {
  const report = await loadOwnerReport(propertyId);
  if (!report) return null;
  const bytes = await renderOwnerReportPdf(report);
  return { bytes, filename: ownerReportFilename(report), report };
}
