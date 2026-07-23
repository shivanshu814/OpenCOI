import { AuditTimeline } from "@/components/audit-timeline";
import { DownloadReportButton } from "@/components/download-report-button";
import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssuePortalLinkButton } from "./issue-portal-link";
import { VendorOnboardingPanel } from "./onboarding-panel";
import { VendorSmsOptIn } from "./sms-opt-in";

function BackLink() {
  return (
    <Link
      href="/app/vendors"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Vendors
    </Link>
  );
}

function VendorHeading({
  name,
  meta,
  status,
}: {
  name: string;
  meta?: string;
  status?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight">{name}</h1>
        <LiveBadge label="Live" />
        {status ? <VendorStatusBadge status={status as never} /> : null}
      </div>
      {meta ? (
        <p className="text-muted-foreground mt-1 text-sm">{meta}</p>
      ) : null}
    </div>
  );
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const events = await listVendorAuditTrail(id);
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <BackLink />
          <VendorHeading name="Demo Roofing LLC" meta="Demo vendor detail" />
        </div>

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
    <div className="space-y-6">
      <div className="space-y-4">
        <BackLink />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <VendorHeading
            name={vendor.name}
            meta={meta.join(" · ")}
            status={vendor.status}
          />
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      </div>

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

        <div className="min-w-0 space-y-6">
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
        </div>
      </div>
    </div>
  );
}
