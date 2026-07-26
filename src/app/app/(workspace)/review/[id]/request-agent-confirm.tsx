"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  apiErrorMessage,
  notifyApiError,
  notifyCaughtError,
  notifyNotSent,
  notifySuccess,
} from "@/lib/ui/toast";
import { MailCheck } from "lucide-react";
import { useState } from "react";

export function RequestAgentConfirmButton({
  documentId,
}: {
  documentId: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/agent-confirm`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        message?: string;
        error?: string;
        reason?: string;
        urlConfirm?: string;
      };
      if (!res.ok) {
        notifyApiError(data, "Agent confirmation not sent");
        return;
      }
      if (data.demo || data.ok === false) {
        notifyNotSent(
          apiErrorMessage(
            data,
            "Agent confirmation not sent — connect Supabase and mail transport.",
          ),
        );
        return;
      }
      notifySuccess(
        data.urlConfirm
          ? "Confirmation email sent to the producer/agent"
          : "Agent confirmation requested",
      );
    } catch (e) {
      notifyCaughtError(e, "Agent confirmation not sent");
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
      <CardContent>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void onClick()}
        >
          {busy ? "Sending…" : "Request agent confirmation"}
        </Button>
      </CardContent>
    </Card>
  );
}
