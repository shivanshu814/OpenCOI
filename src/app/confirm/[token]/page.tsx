import { resolveAgentConfirmation } from "@/lib/agent-confirm/issue";
import { isSupabaseConfigured } from "@/lib/config";
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
        <h1 className="text-xl font-semibold">Agent confirmation</h1>
        <p className="text-muted-foreground text-sm">
          Demo mode — connect Supabase to record Confirm/Deny responses.
        </p>
      </Shell>
    );
  }

  if (!action) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Choose a response</h1>
        <p className="text-muted-foreground text-sm">
          Open the Confirm or Deny link from the email.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            className="text-foreground underline"
            href={`/confirm/${token}?a=confirm`}
          >
            Confirm — valid &amp; current
          </Link>
          <Link
            className="text-foreground underline"
            href={`/confirm/${token}?a=deny`}
          >
            Deny
          </Link>
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
        <h1 className="text-xl font-semibold">Unable to record response</h1>
        <p className="text-muted-foreground text-sm">{result.reason}</p>
      </Shell>
    );
  }

  const title =
    result.status === "confirmed"
      ? "Thank you — certificate confirmed"
      : "Response recorded — marked as not valid";

  return (
    <Shell>
      <h1 className="text-xl font-semibold">{title}</h1>
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
      <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
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
      <header className="border-b px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">CertShield</p>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        {children}
      </main>
    </div>
  );
}
