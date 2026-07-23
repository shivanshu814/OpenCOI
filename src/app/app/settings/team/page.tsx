import { TeamSettingsClient } from "./team-client";

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Team & branding
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Roles (G1) and white-label chase email settings (F2).
        </p>
      </div>
      <TeamSettingsClient />
    </div>
  );
}
