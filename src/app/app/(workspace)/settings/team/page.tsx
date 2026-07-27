import {
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { AgreementTemplateCard } from "./agreement-template-card";
import { TeamSettingsClient } from "./team-client";

export default async function TeamSettingsPage() {
  const session = await getSessionOrg();
  // Demo mode has no session — keep the page explorable.
  const canManage = session ? canAdminSensitive(session.role) : true;

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
      <TeamSettingsClient orgId={session?.orgId ?? null} />
      <AgreementTemplateCard
        orgId={session?.orgId ?? null}
        canManage={canManage}
      />
      <PageSecondary>
        Settings apply to your whole organization. Document review assistance —
        not legal, insurance, or professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
