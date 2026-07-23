"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  vendorId: string;
  phone: string | null;
  smsOptInAt: string | null;
  smsOptOutAt: string | null;
};

export function VendorSmsOptIn({
  vendorId,
  phone: initialPhone,
  smsOptInAt,
  smsOptOutAt,
}: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [optIn, setOptIn] = useState(Boolean(smsOptInAt) && !smsOptOutAt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/sms-opt-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, opt_in: optIn }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setMsg(data.error ?? "Failed");
        return;
      }
      setMsg(
        optIn ? "SMS opt-in saved (TCPA)." : "SMS disabled for this vendor.",
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSave} className="bg-card rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">SMS chasing (TCPA)</h2>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          Texts are sent only with explicit opt-in. Reply STOP opts out
          instantly. Without opt-in, email-only chasing applies.
        </p>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Mobile phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 555 0100"
          />
        </div>
        <label className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
          />
          <span>
            Vendor consented to receive compliance/renewal SMS from CertShield
            on behalf of this property manager. Consent logged with timestamp.
          </span>
        </label>
        {smsOptOutAt ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Opted out via STOP at {new Date(smsOptOutAt).toLocaleString()}.
            Re-check the box only after fresh consent.
          </p>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={busy || (optIn && !phone.trim())}
        >
          {busy ? "Saving…" : "Save SMS settings"}
        </Button>
        {msg ? <p className="text-muted-foreground text-xs">{msg}</p> : null}
      </div>
    </form>
  );
}
