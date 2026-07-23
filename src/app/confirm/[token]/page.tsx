import { BrandMark } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { resolveAgentConfirmation } from "@/lib/agent-confirm/issue";
import { isSupabaseConfigured } from "@/lib/config";
import { CircleCheck, CircleX } from "lucide-react";
import Link from "next/link";

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ a?: string }>;
}) {
  const { token } = await params;
  const { a } = await searchParams;
  const action = a === "deny" ? "deny" : a === "confirm" ? "confirm" : null;

  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold tracking-tight">
          Agent confirmation
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Demo mode — connect Supabase to record Confirm/Deny responses.
        </p>
      </Shell>
    );
  }

  if (!action) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold tracking-tight">
          Choose a response
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Open the Confirm or Deny link from the email.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button render={<Link href={`/confirm/${token}?a=confirm`} />}>
            <CircleCheck className="size-4" />
            Confirm — valid &amp; current
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/confirm/${token}?a=deny`} />}
          >
            <CircleX className="size-4" />
            Deny
          </Button>
        </div>
      </Shell>
    );
  }

  const result = await resolveAgentConfirmation({
    rawToken: token,
    action,
  });

  if (!result.ok) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold tracking-tight">
          Unable to record response
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{result.reason}</p>
      </Shell>
    );
  }

  const confirmed = result.status === "confirmed";
  const title = confirmed
    ? "Thank you — certificate confirmed"
    : "Response recorded — marked as not valid";

  return (
    <Shell>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full",
          confirmed
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        )}
      >
        {confirmed ? (
          <CircleCheck className="size-5" />
        ) : (
          <CircleX className="size-5" />
        )}
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        {result.already
          ? "This link was already used."
          : "Your response is stamped into the audit trail."}
      </p>
      {result.vendorName || result.orgName ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {[result.vendorName, result.orgName].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-8 border-t pt-4 text-xs leading-relaxed">
        Document review assistance — not legal, insurance, or professional
        advice. Mid-term cancellations are mitigated via agent confirmation — no
        tool can guarantee catching a silent cancellation.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <header className="bg-card border-b px-4 py-3 sm:px-6">
        <BrandMark />
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <Card className="[--card-spacing:--spacing(6)]">
          <CardContent className="py-2">{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}
