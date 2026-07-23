import { AuditTimeline } from "@/components/audit-timeline";
import { DownloadReportButton } from "@/components/download-report-button";
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

  if (!isSupabaseConfigured()) {
    const events = await listVendorAuditTrail(id);
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <Link
            href="/app/vendors"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
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
        </div>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Vendor portal (no login)</CardTitle>
            <CardDescription className="text-xs">
              Magic link for upload + status. Also embedded in chase emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            <IssuePortalLinkButton vendorId={id} />
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Audit trail</h2>
          <AuditTimeline events={events} />
        </section>
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
  const meta = [vendor.trade, vendor.email, vendor.agent_email].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/app/vendors"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Vendors
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {vendor.name}
              </h1>
              <VendorStatusBadge status={vendor.status as never} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {meta.join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-6">
          <VendorOnboardingPanel vendorId={vendor.id} />

          <section className="min-w-0 space-y-3">
            <h2 className="text-sm font-semibold">Audit trail</h2>
            <AuditTimeline events={events} />
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Vendor portal (no login)</CardTitle>
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
        </div>
      </div>
    </div>
  );
}
