import type { VendorStatus } from "@/lib/data/types";
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

function escape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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

  const html = `<h2>Owner compliance report</h2>
<p><strong>${escape(report.property.name)}</strong> · ${escape(report.period_label)}<br/>
Prepared by ${escape(report.org_name)}</p>
<p>${escape(report.summary)}</p>
<ul>
<li>Compliance %: <strong>${report.compliance_percent}%</strong></li>
<li>Documents on file: <strong>${report.documents_on_file}</strong></li>
<li>Risks flagged: <strong>${report.risks_flagged}</strong></li>
<li>Expiring ≤30d: <strong>${report.expiring_count}</strong></li>
</ul>
<p style="color:#666;font-size:12px">${escape(report.honesty_note)}</p>
<p style="color:#666;font-size:11px">${escape(report.disclaimer)}</p>`;

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

  for (const property of properties ?? []) {
    const to = (property.owner_report_email as string | null)?.trim();
    if (!to) {
      skipped += 1;
      continue;
    }

    const { data: links } = await supabase
      .from("property_vendors")
      .select("vendor_id")
      .eq("property_id", property.id)
      .eq("org_id", orgId);

    const vendorIds = (links ?? []).map((l) => l.vendor_id as string);
    let vendors: {
      id: string;
      name: string;
      trade: string | null;
      status: VendorStatus;
      documents_on_file: number;
    }[] = [];

    if (vendorIds.length) {
      const { data: vendorRows } = await supabase
        .from("vendors")
        .select("id, name, trade, status")
        .eq("org_id", orgId)
        .in("id", vendorIds);

      const { data: docs } = await supabase
        .from("documents")
        .select("id, vendor_id")
        .eq("org_id", orgId)
        .in("vendor_id", vendorIds);

      const docCountByVendor = new Map<string, number>();
      for (const d of docs ?? []) {
        const vid = d.vendor_id as string;
        docCountByVendor.set(vid, (docCountByVendor.get(vid) ?? 0) + 1);
      }

      vendors = (vendorRows ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        trade: v.trade,
        status: v.status as VendorStatus,
        documents_on_file: docCountByVendor.get(v.id) ?? 0,
      }));
    }

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
