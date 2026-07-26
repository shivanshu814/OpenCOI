import { AuditTimeline } from "@/components/audit-timeline";
import { DownloadReportButton } from "@/components/download-report-button";
import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
import {
  DetailHeader,
  PageFrame,
  PageSecondary,
} from "@/components/page-frame";
import { SendChaseButton } from "@/components/send-chase-button";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  // No invented demo vendors — require live org data.
  if (!isSupabaseConfigured()) notFound();

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
  const meta = [vendor.trade, vendor.email, vendor.agent_email].filter(Boolean);

  return (
    <PageFrame width="wide">
      <DetailHeader
        backHref="/app/vendors"
        backLabel="Vendors"
        title={vendor.name}
        meta={meta.join(" · ") || "No contact details yet"}
        badge={
          <>
            <LiveBadge label="Live" />
            <VendorStatusBadge status={vendor.status as never} />
          </>
        }
        actions={
          <>
            <DownloadReportButton vendorId={vendor.id} label="Report" />
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={`/api/vendors/${vendor.id}/litigation-pack`}
                  download
                />
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
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-6">
          <VendorOnboardingPanel vendorId={vendor.id} />

          <section className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Audit trail</h2>
              <LiveBadge label="Append-only" tone="info" />
            </div>
            <AuditTimeline events={events} />
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="gap-0 overflow-hidden py-0">
            <CardLiveAccent />
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-2">
                Vendor portal (no login)
                <LiveBadge label="Ready" tone="ok" />
              </CardTitle>
              <CardDescription className="text-xs">
                Magic link for upload + status. Also embedded in chase emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-4">
              <IssuePortalLinkButton vendorId={vendor.id} />
            </CardContent>
          </Card>

          <VendorSmsOptIn
            vendorId={vendor.id}
            phone={vendor.phone}
            smsOptInAt={vendor.sms_opt_in_at}
            smsOptOutAt={vendor.sms_opt_out_at}
          />
        </aside>
      </div>

      <PageSecondary>
        You remain the final approver. Document review assistance — not legal,
        insurance, or professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
