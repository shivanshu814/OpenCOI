import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

const nav = [
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/help", label: "Help" },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={className ?? "flex items-center gap-2"}>
      <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
        <ShieldCheck className="size-4" aria-hidden />
      </span>
      <span className="text-foreground text-lg font-semibold tracking-tight">
        CertShield
      </span>
    </span>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="CertShield home" className="shrink-0">
            <BrandMark />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground hover:bg-muted hidden rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:inline-block"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <Button className="ml-1" render={<Link href="/pricing" />}>
              Start from $99
            </Button>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 text-sm sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" aria-hidden />
            <span className="text-foreground font-medium">CertShield</span>
          </div>
          <Link
            href="/pricing"
            className="hover:text-foreground font-medium transition-colors"
          >
            See pricing →
          </Link>
        </div>
        <DisclaimerFooter />
      </footer>
    </div>
  );
}
