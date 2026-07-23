"use client";

import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
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
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
          aria-hidden
        >
          <MailCheck className="size-4" />
        </span>
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-sm font-semibold">Agent confirmation (B8)</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              Emails the producer: Confirm / Deny that this cert is valid &amp;
              current. Mitigates mid-term cancellations — does not detect them
              automatically.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onClick()}
          >
            {busy ? "Sending…" : "Request agent confirmation"}
          </Button>
          {msg ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {msg}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
