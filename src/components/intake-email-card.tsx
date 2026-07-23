"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function IntakeEmailCard({
  email,
  demo,
}: {
  email: string;
  demo?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-lg border px-4 py-4">
      <h2 className="text-sm font-medium">Email-in intake</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Forward COI PDFs to this address. We attach them to a vendor by name
        match (or create a new vendor for review).
        {demo ? " Demo address — connect Supabase for your org token." : null}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="bg-muted rounded px-2 py-1.5 text-sm break-all">
          {email}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
