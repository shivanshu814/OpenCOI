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
import { smsOptInSchema } from "@/lib/validation/schemas";
import { useZodForm } from "@/lib/validation/use-zod-form";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  vendorId: string;
  phone: string | null;
  smsOptInAt: string | null;
  smsOptOutAt: string | null;
  /**
   * False for Read-only members. Consent is a TCPA record, so the write is
   * refused server-side too — this just avoids offering a dead button.
   */
  canEdit: boolean;
};

export function VendorSmsOptIn({
  vendorId,
  phone: initialPhone,
  smsOptInAt,
  smsOptOutAt,
  canEdit,
}: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [optIn, setOptIn] = useState(Boolean(smsOptInAt) && !smsOptOutAt);
  const [busy, setBusy] = useState(false);

  const validation = useZodForm(smsOptInSchema, { phone, opt_in: optIn });

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    validation.markSubmitted();
    if (!canEdit || !validation.valid) return;
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
        <CardTitle>SMS chasing (TCPA) — coming soon</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          SMS is not sending yet — carrier registration (A2P 10DLC) is pending,
          so chasing runs by email today. You can record consent now: texts are
          sent only with explicit opt-in, and replying STOP opts out instantly.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSave}>
        <CardContent className="space-y-3 py-4">
          {!canEdit ? (
            <Alert>
              <AlertDescription className="text-xs">
                Read-only role — recording SMS consent is handled by a Manager
                or Admin.
              </AlertDescription>
            </Alert>
          ) : null}
          <fieldset
            disabled={!canEdit}
            className="m-0 min-w-0 space-y-3 border-0 p-0"
          >
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile phone</Label>
            <Input
              id="phone"
              value={phone}
              aria-invalid={Boolean(validation.errorFor("phone")) || undefined}
              onBlur={() => validation.markTouched("phone")}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 0100"
            />
            {validation.errorFor("phone") ? (
              <p className="text-destructive text-xs" role="alert">
                {validation.errorFor("phone")}
              </p>
            ) : null}
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="sms-consent"
              className="mt-0.5"
              checked={optIn}
              onCheckedChange={(checked) => {
                validation.markTouched("phone");
                setOptIn(checked === true);
              }}
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
            disabled={busy || !validation.valid}
          >
            {busy ? "Saving…" : "Save SMS settings"}
          </Button>
          </fieldset>
        </CardContent>
      </form>
    </Card>
  );
}
