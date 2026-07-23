"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  CustomerDecision,
  DocumentPipelineStatus,
} from "@/lib/data/types";
import {
  OVERRIDE_REASON_CODES,
  OVERRIDE_REASON_LABELS,
  type OverrideReasonCode,
} from "@/lib/verdicts/customer-decision";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  documentId: string;
  status: DocumentPipelineStatus;
  customerDecision?: CustomerDecision | null;
  customerDecisionReason?: string | null;
};

export function ReviewActions({
  documentId,
  status,
  customerDecision,
  customerDecisionReason,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "publish" | "correct" | "accept" | "override" | null
  >(null);
  const [fieldPath, setFieldPath] = useState("policies[0].expiration_date");
  const [afterValue, setAfterValue] = useState("");
  const [reasonCode, setReasonCode] =
    useState<OverrideReasonCode>("requirement_waived");
  const [reasonText, setReasonText] = useState("");

  async function publish() {
    setBusy("publish");
    setMsg(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/publish`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        message?: string;
        error?: string;
        status?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Publish failed");
        return;
      }
      setMsg(
        data.demo
          ? (data.message ?? "Demo publish")
          : "Published. Awaiting your accept or override.",
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function decide(action: "accept" | "override") {
    setBusy(action);
    setMsg(null);
    try {
      const payload =
        action === "accept"
          ? { action: "accept" as const }
          : {
              action: "override" as const,
              reason_code: reasonCode,
              reason_text: reasonCode === "other" ? reasonText : undefined,
            };

      const res = await fetch(`/api/documents/${documentId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        error?: string;
        status?: string;
        customer_decision?: string;
        reason?: string | null;
        routes_to_internal_review?: boolean;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Decision failed");
        return;
      }
      if (data.routes_to_internal_review) {
        setMsg("Dispute recorded — routed back to internal review.");
      } else if (data.customer_decision === "accepted") {
        setMsg("Verdict accepted. You remain the final approver on record.");
      } else {
        setMsg(`Override recorded${data.reason ? `: ${data.reason}` : ""}.`);
      }
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveCorrection() {
    setBusy("correct");
    setMsg(null);
    try {
      let parsed: unknown = afterValue;
      if (afterValue === "true") parsed = true;
      else if (afterValue === "false") parsed = false;
      else if (afterValue === "null") parsed = null;
      else if (/^-?\d+(\.\d+)?$/.test(afterValue.trim())) {
        parsed = Number(afterValue);
      }

      const res = await fetch(`/api/documents/${documentId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_path: fieldPath,
          after_value: parsed,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        message?: string;
        error?: string;
        overall?: string;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Correction failed");
        return;
      }
      setMsg(
        data.demo
          ? (data.message ?? "Demo correction")
          : `Correction saved → golden set. Re-check overall: ${data.overall}`,
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Correction failed");
    } finally {
      setBusy(null);
    }
  }

  if (
    status === "accepted" ||
    status === "overridden" ||
    customerDecision === "accepted" ||
    customerDecision === "overridden"
  ) {
    return (
      <div className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Customer decision</h2>
        </div>
        <div className="space-y-2 px-4 py-3">
          <p className="text-sm font-medium capitalize">
            {customerDecision ?? status}
          </p>
          {customerDecisionReason ? (
            <p className="text-muted-foreground text-xs">
              {customerDecisionReason}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs leading-relaxed">
            Document review assistance — not legal, insurance, or professional
            advice.
          </p>
          {msg ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {msg}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "published") {
    return (
      <div className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Your approval (Appendix B)</h2>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            You are the final approver. Accept the published verdict, or
            override with a logged reason.
          </p>
        </div>

        <div className="space-y-4 px-4 py-4">
          <Button
            onClick={() => void decide("accept")}
            disabled={busy !== null}
          >
            {busy === "accept" ? "Accepting…" : "Accept verdict"}
          </Button>

          <div className="space-y-3 border-t pt-4">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Or override
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reason_code">Reason</Label>
              <select
                id="reason_code"
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                value={reasonCode}
                onChange={(e) =>
                  setReasonCode(e.target.value as OverrideReasonCode)
                }
                disabled={busy !== null}
              >
                {OVERRIDE_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {OVERRIDE_REASON_LABELS[code]}
                  </option>
                ))}
              </select>
            </div>
            {reasonCode === "other" ? (
              <div className="space-y-1.5">
                <Label htmlFor="reason_text">Details</Label>
                <Textarea
                  id="reason_text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Describe the override…"
                  disabled={busy !== null}
                />
              </div>
            ) : null}
            {reasonCode === "extraction_error_dispute" ? (
              <p className="text-xs leading-relaxed text-amber-800">
                Disputes route back to internal review for correction.
              </p>
            ) : null}
            <Button
              variant="outline"
              onClick={() => void decide("override")}
              disabled={
                busy !== null ||
                (reasonCode === "other" && reasonText.trim() === "")
              }
            >
              {busy === "override" ? "Saving…" : "Override with reason"}
            </Button>
          </div>

          {msg ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {msg}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Internal review (founder) — default
  return (
    <div className="bg-card rounded-xl border">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Founder review</h2>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          Approve to publish, or correct a field first — every correction
          becomes a golden-set case.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4">
        <Button onClick={publish} disabled={busy !== null}>
          {busy === "publish" ? "Publishing…" : "Approve & publish"}
        </Button>

        <div className="space-y-3 border-t pt-4">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Save correction (golden set)
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="field_path">Field path</Label>
            <Input
              id="field_path"
              value={fieldPath}
              onChange={(e) => setFieldPath(e.target.value)}
              placeholder="policies[0].limits[0].amount"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="after_value">Corrected value</Label>
            <Input
              id="after_value"
              value={afterValue}
              onChange={(e) => setAfterValue(e.target.value)}
              placeholder="2026-12-31"
            />
          </div>
          <Button
            variant="outline"
            onClick={saveCorrection}
            disabled={busy !== null || !fieldPath || afterValue === ""}
          >
            {busy === "correct" ? "Saving…" : "Save correction"}
          </Button>
        </div>

        {msg ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {msg}
          </p>
        ) : null}
      </div>
    </div>
  );
}
