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

  if (live) {
    const session = await getSessionOrg();
    if (session && !session.onboardingCompletedAt) {
      redirect("/app/onboarding");
    }
  }

  return (
    <AppShell live={live}>
      {live ? <RealtimeRefresh /> : null}
      {children}
    </AppShell>
  );
}
