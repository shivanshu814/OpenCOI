"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SendChaseButton({
  vendorId,
  vendorName,
}: {
  vendorId: string;
  vendorName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send(locale: "en" | "es") {
    setBusy(true);
    setMsg(null);
    setSent(false);
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
        rendered?: { subject: string };
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        setMsg(data.reason ?? data.error ?? "Send failed");
        return;
      }
      if (data.skipped) {
        setMsg(data.reason ?? "Nothing due");
        return;
      }
      const subject = data.rendered?.subject ?? "Chase sent";
      setSent(!data.demo);
      setMsg(
        data.demo
          ? `Demo: ${subject}`
          : `Sent to ${vendorName}: ${subject}`,
      );
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      {msg ? (
        <p
          className={
            sent
              ? "max-w-xs text-right text-xs text-emerald-700"
              : "text-muted-foreground max-w-xs text-right text-xs"
          }
        >
          {sent ? "✓ " : ""}
          {msg}
        </p>
      ) : null}
    </div>
  );
}
