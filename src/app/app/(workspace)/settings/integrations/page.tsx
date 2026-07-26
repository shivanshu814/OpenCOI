import {
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import Link from "next/link";
import { IntegrationsClient } from "./integrations-client";

export default function IntegrationsSettingsPage() {
  return (
    <PageFrame>
      <PageHeader
        title="API & integrations"
        description="Connect CertShield to Zapier or your own tools so vendor status syncs elsewhere — most property managers can skip this."
        audience="Business-tier / advanced setups"
        nextStep={
          <>
            Only set up when you need a sync — otherwise go back to{" "}
            <Link
              href="/app/vendors"
              className="text-foreground underline-offset-2 hover:underline"
            >
              Vendors
            </Link>
            .
          </>
        }
        help="API keys let other apps read vendor data. Webhooks push status changes to your tools (e.g. block work orders for non-compliant vendors). Native AppFolio/Buildium connectors are coming later — Zapier + REST is live today."
        live
      />

      <div className="border-brand/20 bg-brand-muted/40 rounded-xl border px-4 py-3 text-sm leading-relaxed">
        <p className="font-medium text-[#0a5c44]">Advanced — not required</p>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Day-to-day COI tracking works without API keys. Use this page only if
          you need Zapier, a custom integration, or outbound webhooks.
        </p>
      </div>

      <IntegrationsClient />

      <PageSecondary>
        Native AppFolio/Buildium sync is coming later (honestly labeled).
        Document review assistance — not legal, insurance, or professional
        advice.
      </PageSecondary>
    </PageFrame>
  );
}
