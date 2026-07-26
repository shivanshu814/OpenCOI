"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="text-muted-foreground size-4" aria-hidden />
          Agent confirmation (B8)
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Emails the producer: Confirm / Deny that this cert is valid &amp;
          current. Mitigates mid-term cancellations — does not detect them
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
      </CardContent>
    </Card>
  );
}
