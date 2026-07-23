import { DisclaimerFooter } from "@/components/disclaimer-footer";
import Link from "next/link";

const nav = [
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Sign in" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-b border-[#0F2A43]/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[#0F2A43]"
          >
            CertShield
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-[#0F2A43]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="rounded-lg bg-[#0F2A43] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0F2A43]/90"
            >
              Start from $99
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <DisclaimerFooter />
    </div>
  );
}
