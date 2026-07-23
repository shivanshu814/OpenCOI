"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function RequestAgentConfirmButton({
  documentId,
}: {
  documentId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/agent-confirm`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        message?: string;
        error?: string;
        urlConfirm?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Failed");
        return;
      }
      if (data.demo) {
        setMsg(data.message ?? "Demo mode");
        return;
      }
      setMsg(
        data.urlConfirm
          ? "Confirmation email sent to producer/agent."
          : "Requested.",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-xs font-medium tracking-wide uppercase">
        Agent confirmation (B8)
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Emails the producer: Confirm / Deny that this cert is valid &amp;
        current. Mitigates mid-term cancellations — does not detect them
        automatically.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => void onClick()}
      >
        {busy ? "Sending…" : "Request agent confirmation"}
      </Button>
      {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
    </div>
  );
}
