"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
} from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

const REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_features", label: "Missing a feature I need" },
  { value: "not_enough_vendors", label: "Not enough vendors to track" },
  { value: "switching_tool", label: "Switching to another tool" },
  { value: "no_longer_needed", label: "No longer needed / closing business" },
  { value: "other", label: "Other" },
] as const;

type EffectiveFrom = "next_billing_period" | "immediately";

export function CancelPlanButton({ planName }: { planName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [effectiveFrom, setEffectiveFrom] =
    useState<EffectiveFrom>("next_billing_period");

  async function onConfirm() {
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/cancel-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          effectiveFrom,
          reason,
          feedback: feedback.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        notifyApiError(data, "Cancellation failed");
        return;
      }
      notifySuccess(data.message ?? "Cancellation scheduled.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Cancellation failed");
    } finally {
      setBusy(false);
    }
  }

  const options: Array<{
    value: EffectiveFrom;
    title: string;
    detail: string;
  }> = [
    {
      value: "next_billing_period",
      title: "Cancel at period end",
      detail: `Keep ${planName} until the end of the period you already paid for. No further charges.`,
    },
    {
      value: "immediately",
      title: "Cancel now & refund unused time",
      detail:
        "Access ends right away. Paddle prorates a refund for the unused part of this billing period.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive" />
        }
      >
        Cancel subscription
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel your {planName} subscription?</DialogTitle>
          <DialogDescription>
            Your COI data, documents, and audit trail stay intact — only
            billing stops. You can resubscribe anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Why are you canceling?</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value ?? "")}
            >
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-feedback">
              Anything we could have done better?{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="cancel-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Honest feedback goes straight to the founder."
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">When?</legend>
            {options.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 text-sm",
                  effectiveFrom === opt.value
                    ? "border-foreground/40 bg-muted/50"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="cancel-when"
                  value={opt.value}
                  checked={effectiveFrom === opt.value}
                  onChange={() => setEffectiveFrom(opt.value)}
                  className="mt-0.5 accent-foreground"
                />
                <span>
                  <span className="font-medium">{opt.title}</span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {opt.detail}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Keep my plan
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !reason}
            pending={busy}
            onClick={onConfirm}
          >
            {effectiveFrom === "immediately"
              ? "Cancel & refund"
              : "Confirm cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
