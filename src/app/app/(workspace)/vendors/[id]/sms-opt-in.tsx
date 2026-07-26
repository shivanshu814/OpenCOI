"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/ui/format";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
} from "@/lib/ui/toast";
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

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/sms-opt-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, opt_in: optIn }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        notifyApiError(data, "Could not save SMS settings");
        return;
      }
      notifySuccess(
        optIn
          ? "SMS opt-in saved (TCPA consent logged)"
          : "SMS disabled for this vendor",
      );
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Could not save SMS settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>SMS chasing (TCPA)</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Texts are sent only with explicit opt-in. Reply STOP opts out
          instantly. Without opt-in, email-only chasing applies.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSave}>
        <CardContent className="space-y-3 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 0100"
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="sms-consent"
              className="mt-0.5"
              checked={optIn}
              onCheckedChange={(checked) => setOptIn(checked === true)}
            />
            <Label
              htmlFor="sms-consent"
              className="text-muted-foreground text-xs leading-relaxed font-normal"
            >
              Vendor consented to receive compliance/renewal SMS from CertShield
              on behalf of this property manager. Consent logged with timestamp.
            </Label>
          </div>
          {smsOptOutAt ? (
            <Alert className="status-surface status-warn">
              <AlertDescription className="text-xs">
                Opted out via STOP at {formatDateTime(smsOptOutAt)}.
                Re-check the box only after fresh consent.
              </AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={busy || (optIn && !phone.trim())}
          >
            {busy ? "Saving…" : "Save SMS settings"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
