import { IntegrationsClient } from "./integrations-client";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          API &amp; webhooks
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Public REST + Zapier-friendly hooks (E4). Business-tier packaging.
        </p>
      </div>
      <IntegrationsClient />
    </div>
  );
}
