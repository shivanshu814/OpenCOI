import { DisclaimerFooter } from "@/components/disclaimer-footer";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              CertShield
            </span>
          </span>
          <span className="text-muted-foreground text-xs">
            Vendor portal · Portal de proveedores
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:py-10">
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
