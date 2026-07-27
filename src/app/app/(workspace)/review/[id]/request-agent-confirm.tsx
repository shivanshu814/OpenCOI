"use client";

import { Button } from "@/components/ui/button";
import {
  apiErrorMessage,
  notifyApiError,
  notifyCaughtError,
  notifyNotSent,
  notifySuccess,
} from "@/lib/ui/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";

/**
 * Sends the B8 request. The *result* is rendered by AgentConfirmationPanel,
 * which is why this refreshes the route on success — otherwise the row lands
 * in Postgres and the person who just clicked sees no change.
 */
export function RequestAgentConfirmButton({
  documentId,
  hasPending = false,
}: {
  documentId: string;
  hasPending?: boolean;
}) {
  const router = useRouter();
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
      router.refresh();
    } catch (e) {
      notifyCaughtError(e, "Agent confirmation not sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      pending={busy}
      pendingIcon={MailCheck}
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy
        ? "Sending…"
        : hasPending
          ? "Send another request"
          : "Request agent confirmation"}
    </Button>
  );
}
