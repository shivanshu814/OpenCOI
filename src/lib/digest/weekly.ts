import type { VendorStatus } from "@/lib/data/types";
import { sendOutboundEmail } from "@/lib/email/resend";
import { portfolioComplianceScore } from "@/lib/scores/compute";
import { createAdminClient } from "@/lib/supabase/admin";

/** C6 weekly digest — "5 expiring, 2 new non-compliant". */
export async function sendWeeklyDigestForOrg(orgId: string): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  demo?: boolean;
}> {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("orgs")
    .select("id, name, digest_email, digest_enabled, chase_notify_email")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return { ok: false, reason: "Org not found" };
  if (org.digest_enabled === false) {
    return { ok: true, skipped: true, reason: "digest disabled" };
  }

  const to = (org.digest_email || org.chase_notify_email || "").trim();
  if (!to) {
    return { ok: true, skipped: true, reason: "no digest email" };
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, status")
    .eq("org_id", orgId);

  const list = (vendors ?? []) as {
    id: string;
    name: string;
    status: VendorStatus;
  }[];
  const portfolio = portfolioComplianceScore(list);
  const expiring = list.filter((v) => v.status === "expiring");
  const nonCompliant = list.filter((v) => v.status === "non_compliant");
  const missing = list.filter((v) => v.status === "missing_docs");
  const inReview = list.filter((v) => v.status === "in_review");

  const subject = `${org.name} weekly compliance digest — score ${portfolio.score}`;
  const text = [
    `Weekly digest for ${org.name}`,
    "",
    `Portfolio compliance score: ${portfolio.score}/100 (${portfolio.counted} vendors)`,
    `Expiring ≤30d: ${expiring.length}`,
    `Non-compliant: ${nonCompliant.length}`,
    `Missing docs: ${missing.length}`,
    `In review: ${inReview.length}`,
    "",
    expiring.length
      ? `Expiring:\n${expiring
        .slice(0, 15)
        .map((v) => `· ${v.name}`)
        .join("\n")}`
      : "No vendors expiring.",
    "",
    nonCompliant.length
      ? `Non-compliant:\n${nonCompliant
        .slice(0, 15)
        .map((v) => `· ${v.name}`)
        .join("\n")}`
      : "No non-compliant vendors.",
    "",
    "Document review assistance — not legal, insurance, or professional advice.",
    "We catch expirations and chase renewals automatically; mid-term cancellations are mitigated via agent confirmation — no tool can guarantee catching a silent cancellation.",
  ].join("\n");

  const html = `<h2>Weekly digest — ${escape(org.name)}</h2>
<p><strong>Portfolio score:</strong> ${portfolio.score}/100 · ${portfolio.counted} vendors</p>
<ul>
<li>Expiring ≤30d: <strong>${expiring.length}</strong></li>
<li>Non-compliant: <strong>${nonCompliant.length}</strong></li>
<li>Missing docs: <strong>${missing.length}</strong></li>
<li>In review: <strong>${inReview.length}</strong></li>
</ul>
${listBlock("Expiring", expiring)}
${listBlock("Non-compliant", nonCompliant)}
<p style="color:#666;font-size:12px">Document review assistance — not legal, insurance, or professional advice. Mid-term cancellations are mitigated via agent confirmation — not automatic detection.</p>`;

  const send = await sendOutboundEmail({
    to,
    subject,
    text,
    html,
    tags: [{ name: "template", value: "weekly_digest" }],
  });

  if (!send.ok) return { ok: false, reason: send.error };

  await supabase.from("audit_events").insert({
    org_id: orgId,
    actor_type: "system",
    actor_id: "digest:weekly",
    entity_type: "org",
    entity_id: orgId,
    action: "weekly_digest_sent",
    after_state: {
      to,
      score: portfolio.score,
      expiring: expiring.length,
      non_compliant: nonCompliant.length,
      transport: send.transport,
    },
  });

  return { ok: true, demo: false };
}

function listBlock(
  title: string,
  vendors: { name: string }[],
): string {
  if (!vendors.length) return `<p>No ${title.toLowerCase()} vendors.</p>`;
  return `<p><strong>${title}:</strong></p><ul>${vendors
    .slice(0, 15)
    .map((v) => `<li>${escape(v.name)}</li>`)
    .join("")}</ul>`;
}

function escape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
