import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getSessionOrg } from "@/lib/auth/session";
import {
  isEmailInboundConfigured,
  isSupabaseConfigured,
} from "@/lib/config";

export default async function OnboardingPage() {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;
  const inboundLive = isEmailInboundConfigured();

  const orgName = session?.orgName ?? "My organization";
  // Only show an address when inbound is actually wired; never fake LISTENING.
  const intakeEmail =
    inboundLive && session?.intakeEmail ? session.intakeEmail : null;

  return (
    <OnboardingWizard
      defaultOrgName={orgName}
      intakeEmail={intakeEmail}
      inboundLive={inboundLive}
    />
  );
}
