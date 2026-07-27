"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  notifyApiError,
  notifyCaughtError,
  notifyNotSent,
  notifySuccess,
} from "@/lib/ui/toast";
import { Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SendOwnerReportButton({
  propertyId,
  toHint,
  variant = "outline",
  label = "Email owner report",
}: {
  propertyId: string;
  toHint?: string | null;
  /** `primary` = mint CTA for Reports list; outline elsewhere. */
  variant?: "outline" | "primary";
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSend() {
    setBusy(true);
    try {
      const res = await fetch("/api/reports/owner/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const data = (await res.json()) as {
        error?: string;
        reason?: string;
        to?: string;
        demo?: boolean;
        ok?: boolean;
        compliance_percent?: number;
      };
      if (!res.ok || data.ok === false) {
        notifyApiError(data, "Owner report not sent");
        return;
      }
      // Demo flag without a real send — never celebrate delivery.
      if (data.demo) {
        notifyNotSent(
          data.error ??
            data.reason ??
            "Owner report not emailed — connect mail transport to send live.",
        );
        return;
      }
      const to = data.to ?? toHint ?? "owner";
      const pct =
        typeof data.compliance_percent === "number"
          ? ` (${data.compliance_percent}% covered)`
          : "";
      notifySuccess(`Owner report emailed to ${to}${pct}`);
      // Records a send against the property, so the "last sent" line on the
      // page has to re-read rather than wait for the next manual reload.
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Owner report not sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant === "primary" ? "default" : "outline"}
      size="sm"
      pending={busy}
      pendingIcon={Send}
      pendingMotion="fly"
      disabled={busy}
      onClick={onSend}
      title={toHint ? `Send to ${toHint}` : "Set owner email on property first"}
      className={cn(
        "gap-1.5",
        variant === "primary" &&
          "bg-brand text-brand-foreground hover:bg-brand/90",
      )}
    >
      <Mail className="size-3.5" strokeWidth={2.25} aria-hidden />
      {busy ? "Sending…" : label}
    </Button>
  );
}
