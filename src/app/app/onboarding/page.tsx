import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getSessionOrg } from "@/lib/auth/session";
import {
  isEmailInboundConfigured,
  isSupabaseConfigured,
} from "@/lib/config";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;

  if (session?.onboardingCompletedAt) {
    redirect("/app");
  }

  const inboundLive = isEmailInboundConfigured();
  const orgName = session?.orgName ?? "My organization";
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
