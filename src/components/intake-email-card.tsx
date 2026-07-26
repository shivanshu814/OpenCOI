"use client";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/ui/clipboard";
import { Check, Copy, Inbox, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function IntakeEmailCard({
  email,
  inboundLive,
  /** When true, hide the Upload CTA (already on /app/upload). */
  hideUploadCta = false,
}: {
  email: string | null;
  /** True only when Postmark inbound webhook secrets are configured. */
  inboundLive: boolean;
  hideUploadCta?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!email) return;
    const ok = await copyToClipboard(email, {
      successMessage: "Intake address copied",
    });
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!inboundLive || !email) {
    return (
      <div className="border-border space-y-4 rounded-xl border px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Upload className="text-muted-foreground size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold">Email-forward intake</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Not connected yet (needs Postmark + MX). Use{" "}
              <strong className="text-foreground font-medium">Upload COI</strong>{" "}
              in the sidebar — that path is live today.
            </p>
          </div>
        </div>
        {hideUploadCta ? null : (
          <Link
            href="/app/upload"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-2",
            )}
          >
            <Upload className="size-4" />
            Go to Upload COI
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="border-border space-y-4 rounded-xl border px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="bg-brand-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Inbox className="text-brand size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold">Email-in address (live)</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Forward vendor COI PDFs to this address. We match the insured name to
            a vendor (or queue a new one for review). You can still upload from
            the app anytime.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="bg-muted inline-flex max-w-full items-center rounded-lg px-3 py-2 text-sm break-all">
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
    </div>
  );
}
