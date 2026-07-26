import { PageHeader } from "@/components/page-header";
import { IntegrationsClient } from "./integrations-client";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API & webhooks"
        description="Public REST + Zapier-friendly hooks (E4). Business-tier packaging."
        live
      />
      <IntegrationsClient />
    </div>
  );
}
