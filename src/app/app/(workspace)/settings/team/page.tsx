import {
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { TeamSettingsClient } from "./team-client";

export default function TeamSettingsPage() {
  return (
    <PageFrame>
      <PageHeader
        title="Team & branding"
        description="Invite teammates with the right role, and optionally brand chase emails with your logo."
        audience="Org admins"
        nextStep="Invite a teammate, or set chase-email branding if vendors should see your logo."
        help="Roles control who can upload, review, and change billing. White-label branding applies to vendor-facing chase emails — not a guarantee of compliance."
        live
      />
      <TeamSettingsClient />
      <PageSecondary>
        Required for multi-user orgs. Branding is optional polish for vendor
        emails. Document review assistance — not legal, insurance, or
        professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
