import { AppShell } from "@/components/app-shell";
import { IntercomMessenger } from "@/components/intercom-messenger";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { INTERCOM_APP_ID, intercomUserHash } from "@/lib/intercom";
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

  // Hash is computed here, server-side, and never reaches the client as a
  // secret — only the digest crosses. A null hash means no messenger boots
  // (see lib/intercom.ts): absent beats impersonable.
  const userHash = session ? intercomUserHash(session.userId) : null;
  const intercom =
    session && userHash
      ? {
          appId: INTERCOM_APP_ID,
          userId: session.userId,
          userHash,
          email: session.email,
          company: { id: session.orgId, name: session.orgName },
        }
      : null;

  return (
    <AppShell
      live={live}
      branding={{
        orgName: session?.orgName ?? null,
        brandColor: session?.brandColor ?? null,
        logoUrl: session?.logoUrl ?? null,
      }}
      account={session ? { email: session.email, role: session.role } : null}
    >
      {live ? <RealtimeRefresh scope={session?.orgId ?? null} /> : null}
      <IntercomMessenger identity={intercom} />
      {children}
    </AppShell>
  );
}
