import { DisclaimerFooter } from "@/components/disclaimer-footer";
import Link from "next/link";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">
            CertShield
          </span>
          <span className="text-muted-foreground text-xs">Vendor portal</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
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
