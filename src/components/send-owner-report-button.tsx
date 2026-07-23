"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SendOwnerReportButton({
  propertyId,
  toHint,
}: {
  propertyId: string;
  toHint?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSend() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reports/owner/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const data = (await res.json()) as {
        error?: string;
        to?: string;
        demo?: boolean;
        compliance_percent?: number;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Send failed");
        return;
      }
      setMsg(
        data.demo
          ? `Demo send logged → ${data.to}`
          : `Sent to ${data.to} (${data.compliance_percent}% covered)`,
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={onSend}
      >
        {busy ? "Sending…" : "Email owner report"}
      </Button>
      {toHint ? (
        <span className="text-muted-foreground text-xs">→ {toHint}</span>
      ) : null}
      {msg ? (
        <span className="text-muted-foreground text-xs">{msg}</span>
      ) : null}
    </div>
  );
}
