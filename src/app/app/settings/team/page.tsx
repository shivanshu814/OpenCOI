import { PageHeader } from "@/components/page-header";
import { TeamSettingsClient } from "./team-client";

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & branding"
        description="Roles (G1) and white-label chase email settings (F2)."
        live
      />
      <TeamSettingsClient />
    </div>
  );
}
