import { AppShell } from "@/components/app-shell";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;

  if (session && !session.onboardingCompletedAt) {
    redirect("/app/onboarding");
  }

  return (
    <AppShell
      live={live}
      branding={{
        orgName: session?.orgName ?? null,
        brandColor: session?.brandColor ?? null,
        logoUrl: session?.logoUrl ?? null,
      }}
      account={
        session ? { email: session.email, role: session.role } : null
      }
    >
      {live ? <RealtimeRefresh scope={session?.orgId ?? null} /> : null}
      {children}
    </AppShell>
  );
}
