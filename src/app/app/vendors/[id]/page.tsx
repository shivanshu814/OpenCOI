import { AuditTimeline } from "@/components/audit-timeline";
import { DownloadReportButton } from "@/components/download-report-button";
import { SendChaseButton } from "@/components/send-chase-button";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { listVendorAuditTrail } from "@/lib/audit/list";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssuePortalLinkButton } from "./issue-portal-link";
import { VendorOnboardingPanel } from "./onboarding-panel";
import { VendorSmsOptIn } from "./sms-opt-in";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const events = await listVendorAuditTrail(id);
    return (
      <div className="space-y-8">
        <Link href="/app/vendors" className="text-muted-foreground text-sm">
          ← Vendors
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Demo Roofing LLC
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Demo vendor detail
          </p>
        </div>
        <IssuePortalLinkButton vendorId={id} />
        <AuditTimeline events={events} />
      </div>
    );
  }

  const session = await getSessionOrg();
  if (!session) notFound();

  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select(
      "id, name, email, trade, status, preferred_locale, agent_email, phone, sms_opt_in_at, sms_opt_out_at",
    )
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!vendor) notFound();

  const events = await listVendorAuditTrail(id);

  return (
    <div className="space-y-8">
      <Link href="/app/vendors" className="text-muted-foreground text-sm">
        ← Vendors
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {vendor.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {[vendor.trade, vendor.email].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2">
            <VendorStatusBadge status={vendor.status as never} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadReportButton vendorId={vendor.id} label="Report" />
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/vendors/${vendor.id}/litigation-pack`} download />
            }
          >
            Litigation pack
          </Button>
          <SendChaseButton vendorId={vendor.id} vendorName={vendor.name} />
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/app/upload?vendor=${vendor.id}`} />}
          >
            Upload
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Vendor portal (no login)</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Magic link for upload + status. Also embedded in chase emails.
        </p>
        <div className="mt-3">
          <IssuePortalLinkButton vendorId={vendor.id} />
        </div>
      </div>

      <VendorOnboardingPanel vendorId={vendor.id} />

      <VendorSmsOptIn
        vendorId={vendor.id}
        phone={vendor.phone}
        smsOptInAt={vendor.sms_opt_in_at}
        smsOptOutAt={vendor.sms_opt_out_at}
      />

      <div>
        <h2 className="mb-3 text-sm font-medium">Audit trail</h2>
        <AuditTimeline events={events} />
      </div>
    </div>
  );
}
