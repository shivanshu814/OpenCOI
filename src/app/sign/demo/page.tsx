import { BrandMark } from "@/components/certshield-logo";
import { CardLiveAccent, LiveBadge } from "@/components/live-activity";
import { Card, CardContent } from "@/components/ui/card";
import { PenLine } from "lucide-react";
import Link from "next/link";

/** Demo Documenso stand-in when DOCUMENSO_API_KEY is unset. */
export default async function DemoSignPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; email?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="bg-card flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <BrandMark />
        <LiveBadge label="Demo" tone="warn" />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <Card className="gap-0 overflow-hidden py-0 [--card-spacing:--spacing(6)]">
          <CardLiveAccent />
          <CardContent className="py-6">
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
              <PenLine className="size-5" />
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              Demo e-sign (Documenso not connected)
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {sp.title ?? "Agreement"} · {sp.email ?? "signer"}
            </p>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              Connect{" "}
              <code className="bg-muted text-foreground rounded px-1 py-0.5 text-xs">
                DOCUMENSO_API_KEY
              </code>{" "}
              and{" "}
              <code className="bg-muted text-foreground rounded px-1 py-0.5 text-xs">
                DOCUMENSO_API_URL
              </code>{" "}
              for live signing. This page confirms the Week 5 flow without a
              password.
            </p>
            <Link
              href="/"
              className="text-foreground mt-6 inline-block text-sm font-medium underline underline-offset-4"
            >
              Back to CertShield
            </Link>
            <p className="text-muted-foreground mt-8 border-t pt-4 text-xs leading-relaxed">
              Document review assistance — not legal, insurance, or professional
              advice.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
