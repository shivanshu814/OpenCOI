import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const nav = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/vendors", label: "Vendors" },
  { href: "/app/review", label: "Review queue" },
  { href: "/app/upload", label: "Upload" },
  { href: "/app/settings/billing", label: "Billing" },
];

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

  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-sm font-semibold tracking-tight">
              CertShield
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <span className="text-muted-foreground text-xs">
            {live ? (
              <Link href="/login" className="hover:text-foreground">
                Supabase live · account
              </Link>
            ) : (
              "Demo mode — connect Supabase"
            )}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <DisclaimerFooter />
    </div>
  );
}
