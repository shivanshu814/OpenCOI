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
      <header className="border-b px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">CertShield</p>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-10">
        <h1 className="text-xl font-semibold tracking-tight">
          Demo e-sign (Documenso not connected)
        </h1>
        <p className="text-muted-foreground text-sm">
          {sp.title ?? "Agreement"} · {sp.email ?? "signer"}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect <code className="text-foreground">DOCUMENSO_API_KEY</code> and{" "}
          <code className="text-foreground">DOCUMENSO_API_URL</code> for live
          signing. This page confirms the Week 5 flow without a password.
        </p>
        <p className="text-muted-foreground text-xs">
          Document review assistance — not legal, insurance, or professional
          advice.
        </p>
        <Link href="/" className="text-sm underline">
          Back to CertShield
        </Link>
      </main>
    </div>
  );
}
