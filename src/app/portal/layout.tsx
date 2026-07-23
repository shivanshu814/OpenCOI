import { BrandMark } from "@/components/certshield-logo";
import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { LiveBadge, PortalLiveTicker } from "@/components/live-activity";
import Link from "next/link";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <BrandMark markSize={26} />
          <div className="flex flex-col items-end gap-1.5">
            <LiveBadge label="No login" tone="ok" />
            <span className="text-muted-foreground text-right text-xs leading-snug">
              Vendor portal · Portal de proveedores
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-8 sm:py-10">
        <PortalLiveTicker />
        {children}
      </main>
      <DisclaimerFooter />
      <p className="text-muted-foreground pb-6 text-center text-xs">
        No account required.{" "}
        <Link href="/" className="underline underline-offset-2">
          About CertShield
        </Link>
      </p>
    </div>
  );
}
