"use client";

import { Button } from "@/components/ui/button";
import {
  apiErrorMessage,
  notifyApiError,
  notifyInfo,
  notifyNotSent,
  notifySuccess,
} from "@/lib/ui/toast";
import { useState } from "react";

export function SendChaseButton({
  vendorId,
  vendorName,
}: {
  vendorId: string;
  vendorName: string;
}) {
  const [busy, setBusy] = useState(false);

  async function send(locale: "en" | "es") {
    setBusy(true);
    try {
      const res = await fetch("/api/chase/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, locale }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        skipped?: boolean;
        reason?: string;
        demo?: boolean;
        note?: string;
        rendered?: { subject: string };
        error?: string;
        message?: string;
      };

      if (!res.ok || data.ok === false) {
        notifyApiError(data, "Chase send failed");
        return;
      }
      // Demo / no-transport preview: never claim the email was delivered.
      if (data.demo) {
        notifyNotSent(
          apiErrorMessage(
            data,
            "Chase not sent — configure SMTP or Resend to email vendors.",
          ),
        );
        return;
      }
      if (data.skipped) {
        notifyInfo(data.reason ?? "Nothing due for this vendor yet.");
        return;
      }

      notifySuccess(
        `Chase email sent to ${vendorName} (${locale.toUpperCase()})`,
      );
    } catch {
      notifyApiError(null, "Network error — chase not sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => send("en")}
      >
        Chase EN
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => send("es")}
      >
        Chase ES
      </Button>
    </div>
  );
}
