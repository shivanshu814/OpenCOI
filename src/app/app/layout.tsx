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

  if (live) {
    const session = await getSessionOrg();
    const onOnboarding = pathname.startsWith("/app/onboarding");
    if (
      session &&
      !session.onboardingCompletedAt &&
      !onOnboarding &&
      pathname.startsWith("/app")
    ) {
      redirect("/app/onboarding");
    }
  }

  return <AppShell live={live}>{children}</AppShell>;
}
