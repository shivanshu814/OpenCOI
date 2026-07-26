import { AppShell } from "@/components/app-shell";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const live = isSupabaseConfigured();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const onOnboarding = pathname.startsWith("/app/onboarding");

  if (live) {
    const session = await getSessionOrg();
    if (
      session &&
      !session.onboardingCompletedAt &&
      !onOnboarding &&
      pathname.startsWith("/app")
    ) {
      redirect("/app/onboarding");
    }
  }

  // Onboarding is a focused full-page flow — no app sidebar/chrome.
  if (onOnboarding) {
    return <>{children}</>;
  }

  return <AppShell live={live}>{children}</AppShell>;
}
