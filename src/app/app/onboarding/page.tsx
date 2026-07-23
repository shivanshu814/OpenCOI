import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";

export default async function OnboardingPage() {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;

  const orgName = session?.orgName ?? "My organization";
  const intakeEmail =
    session?.intakeEmail ?? "demo@in.certshield.com";

  return (
    <div className="py-4">
      <OnboardingWizard defaultOrgName={orgName} intakeEmail={intakeEmail} />
    </div>
  );
}
