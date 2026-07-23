"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Copy, Inbox } from "lucide-react";
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
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Inbox className="text-muted-foreground size-4" />
          Email-in intake
        </CardTitle>
        <CardDescription>
          Forward COI PDFs to this address. We attach them to a vendor by name
          match (or create a new vendor for review).
          {demo ? " Demo address — connect Supabase for your org token." : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
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
      </CardContent>
    </Card>
  );
}
