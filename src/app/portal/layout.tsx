import { BrandMark } from "@/components/certshield-logo";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { LiveBadge } from "@/components/live-activity";
import Link from "next/link";

/**
 * Vendor portal chrome — same full-width workspace rhythm as AppShell
 * (header + padded main up to max-w-[110rem]), minus the signed-in sidebar.
 * Magic-link only: never gate vendors behind a password (spec rule 7).
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="bg-card/80 supports-[backdrop-filter]:bg-card/70 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark markSize={26} />
            <span className="bg-border hidden h-5 w-px sm:block" aria-hidden />
            <span className="text-muted-foreground hidden text-sm sm:inline">
              Vendor portal · Portal de proveedores
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LiveBadge label="No login" tone="ok" />
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground hidden text-xs underline-offset-2 hover:underline sm:inline"
            >
              About CertShield
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[110rem] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {children}
      </main>
      <DisclaimerFooter showBothLocales />
      <p className="text-muted-foreground pb-6 text-center text-xs">
        No account required.{" "}
        <Link href="/" className="underline underline-offset-2">
          About CertShield
        </Link>
      </p>
    </div>
  );
}
