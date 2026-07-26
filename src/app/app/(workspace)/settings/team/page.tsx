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
        title="Workspace settings"
        description="Your company profile, branding, notification channels, and who on your team can do what."
        audience="Org admins"
        nextStep="Confirm your company details, then choose where compliance alerts are sent."
        help="Your company profile appears on owner reports and vendor-facing emails. Roles control who can upload, review, and change billing. Branding is presentation only — never a guarantee of compliance."
        live
      />
      <TeamSettingsClient />
      <PageSecondary>
        Settings apply to your whole organization. Document review assistance —
        not legal, insurance, or professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
