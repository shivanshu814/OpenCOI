"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  CustomerDecision,
  DocumentPipelineStatus,
} from "@/lib/data/types";
import { DISCLAIMER } from "@/lib/extraction/schema";
import type { Verdict } from "@/lib/requirements/engine";
import {
  notifyApiError,
  notifyCaughtError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import {
  OVERRIDE_REASON_CODES,
  OVERRIDE_REASON_LABELS,
  type OverrideReasonCode,
} from "@/lib/verdicts/customer-decision";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  documentId: string;
  status: DocumentPipelineStatus;
  overallVerdict?: Verdict | null;
  customerDecision?: CustomerDecision | null;
  customerDecisionReason?: string | null;
};

type FieldKind = "date" | "text" | "number" | "boolean";

type CorrectionPreset = {
  id: string;
  label: string;
  path: string | null;
  kind: FieldKind;
  hint: string;
  placeholder: string;
};

const CORRECTION_PRESETS: CorrectionPreset[] = [
  {
    id: "expiration",
    label: "Policy expiration date",
    path: "policies[0].expiration_date",
    kind: "date",
    hint: "Copy the date from the PDF. Enter as YYYY-MM-DD (e.g. 01/01/2027 → 2027-01-01).",
    placeholder: "YYYY-MM-DD",
  },
  {
    id: "effective",
    label: "Policy effective date",
    path: "policies[0].effective_date",
    kind: "date",
    hint: "Copy the date from the PDF. Enter as YYYY-MM-DD.",
    placeholder: "YYYY-MM-DD",
  },
  {
    id: "policy_number",
    label: "Policy number",
    path: "policies[0].policy_number",
    kind: "text",
    hint: "Exact policy number as printed on the certificate.",
    placeholder: "As shown on the cert",
  },
  {
    id: "insured",
    label: "Named insured",
    path: "insured.name",
    kind: "text",
    hint: "Match the named insured on the certificate.",
    placeholder: "Legal name as printed",
  },
  {
    id: "holder",
    label: "Certificate holder",
    path: "certificate_holder.name",
    kind: "text",
    hint: "Match the certificate holder block on the PDF.",
    placeholder: "Holder name as printed",
  },
  {
    id: "limit",
    label: "Primary limit amount",
    path: "policies[0].limits[0].amount",
    kind: "number",
    hint: "Enter the dollar amount as a number only (no $ or commas).",
    placeholder: "e.g. 1000000",
  },
  {
    id: "producer",
    label: "Producer / agency",
    path: "producer.name",
    kind: "text",
    hint: "Insurance agency name from the producer section.",
    placeholder: "Agency name as printed",
  },
  {
    id: "ai_checkbox",
    label: "Additional insured checkbox",
    path: "policies[0].checkboxes.additional_insured",
    kind: "boolean",
    hint: "Use true or false based on whether the box is checked on the cert.",
    placeholder: "true or false",
  },
  {
    id: "other",
    label: "Other field…",
    path: null,
    kind: "text",
    hint: "Choose a common field above when possible. Advanced path only if needed.",
    placeholder: "Corrected value",
  },
];

function parseCorrectedValue(raw: string, kind: FieldKind): unknown {
  const trimmed = raw.trim();
  if (kind === "boolean") {
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
    return trimmed;
  }
  if (kind === "number") {
    const n = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(n) ? n : trimmed;
  }
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return raw;
}

export function ReviewActions({
  documentId,
  status,
  overallVerdict = null,
  customerDecision,
  customerDecisionReason,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<
    "publish" | "correct" | "accept" | "override" | null
  >(null);
  const [presetId, setPresetId] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [afterValue, setAfterValue] = useState("");
  const [reasonCode, setReasonCode] =
    useState<OverrideReasonCode>("requirement_waived");
  const [reasonText, setReasonText] = useState("");

  const selectedPreset = useMemo(
    () => CORRECTION_PRESETS.find((p) => p.id === presetId) ?? null,
    [presetId],
  );

  const fieldPath =
    selectedPreset?.path ?? (presetId === "other" ? customPath.trim() : "");
  const canSaveCorrection =
    Boolean(fieldPath) && afterValue.trim() !== "" && busy === null;

  const needsAttention =
    overallVerdict === "FAIL" || overallVerdict === "MISSING";

  async function publish() {
    setBusy("publish");
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
        notifyApiError(data, "Publish failed");
        return;
      }
      if (data.demo) {
        notifyWarning(
          data.message ??
            "Published in demo mode only — connect Supabase for live publish.",
        );
      } else {
        notifySuccess(
          "Published for customer review — you remain the final approver",
        );
      }
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function decide(action: "accept" | "override") {
    setBusy(action);
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
        notifyApiError(data, "Decision failed");
        return;
      }
      if (data.routes_to_internal_review) {
        notifyInfo("Dispute recorded — routed back to internal review");
      } else if (data.customer_decision === "accepted") {
        notifySuccess(
          "Verdict accepted — you remain the final approver on record",
        );
      } else {
        notifySuccess(
          data.reason
            ? `Override recorded: ${data.reason}`
            : "Override recorded",
        );
      }
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveCorrection() {
    if (!fieldPath || afterValue.trim() === "") return;
    setBusy("correct");
    try {
      const kind = selectedPreset?.kind ?? "text";
      const parsed = parseCorrectedValue(afterValue, kind);

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
        notifyApiError(data, "Correction failed");
        return;
      }
      setAfterValue("");
      if (data.demo) {
        notifyWarning(
          data.message ??
            "Correction saved in demo mode only — connect Supabase for golden-set persistence.",
        );
      } else {
        notifySuccess(
          `Correction saved · re-check overall: ${data.overall ?? "updated"}`,
        );
      }
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Correction failed");
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
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Customer decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium capitalize">
            {customerDecision ?? status}
          </p>
          {customerDecisionReason ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {customerDecisionReason}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs leading-relaxed">
            {DISCLAIMER}
          </p>
          {msg ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {msg}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (status === "published") {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Your approval (Appendix B)</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            You are the final approver. Accept the published verdict, or
            override with a logged reason.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Button
            onClick={() => void decide("accept")}
            disabled={busy !== null}
          >
            {busy === "accept" ? "Accepting…" : "Accept verdict"}
          </Button>

          <div className="space-y-3 border-t pt-5">
            <div>
              <p className="text-sm font-medium">Or override</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Overrides are logged. Extraction-error disputes return to
                internal review.
              </p>
            </div>
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
              <Alert className="border-amber-200 bg-amber-50/50 text-amber-950">
                <TriangleAlert className="size-4 text-amber-600" aria-hidden />
                <AlertDescription className="text-xs leading-relaxed text-amber-800">
                  Disputes route back to internal review for correction.
                </AlertDescription>
              </Alert>
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

          <p className="text-muted-foreground text-xs leading-relaxed">
            {DISCLAIMER}
          </p>
          {msg ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {msg}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // Internal review (founder) — default
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Founder review</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Verify the PDF side-by-side, correct any wrong extraction, then
          publish the reviewed verdict. Publishing is not auto-approval — the
          customer remains the final approver.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {needsAttention ? (
          <Alert className="border-amber-200 bg-amber-50/50 text-amber-950">
            <TriangleAlert className="size-4 text-amber-600" aria-hidden />
            <AlertTitle className="text-sm text-amber-950">
              {overallVerdict === "FAIL"
                ? "FAIL remains review-required"
                : "MISSING fields need verification"}
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-amber-800">
              Correct extraction mistakes first when the PDF disagrees. You may
              still publish after verification so the customer can accept or
              override — publishing does not clear FAIL/MISSING or auto-approve.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* 1. Correct extraction → golden set + re-check */}
        <section className="space-y-4" aria-labelledby="correct-heading">
          <div>
            <h3 id="correct-heading" className="text-sm font-semibold">
              1. Correct extraction &amp; re-check
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Fix a field that doesn&apos;t match the PDF. Each save appends a
              golden-set case and re-runs compliance checks.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="correction_field">Field to correct</Label>
            <select
              id="correction_field"
              className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              value={presetId}
              onChange={(e) => {
                setPresetId(e.target.value);
                setAfterValue("");
                setMsg(null);
              }}
              disabled={busy !== null}
            >
              <option value="" disabled>
                Select a field…
              </option>
              {CORRECTION_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {presetId === "other" ? (
            <div className="space-y-1.5">
              <Label htmlFor="custom_field_path">Extraction field path</Label>
              <Input
                id="custom_field_path"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="e.g. policies[0].limits[1].amount"
                disabled={busy !== null}
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Advanced only — prefer a preset above when the field is listed.
              </p>
            </div>
          ) : null}

          {selectedPreset ? (
            <div className="space-y-1.5">
              <Label htmlFor="after_value">Corrected value</Label>
              <Input
                id="after_value"
                value={afterValue}
                onChange={(e) => setAfterValue(e.target.value)}
                placeholder={selectedPreset.placeholder}
                disabled={busy !== null}
                autoComplete="off"
                inputMode={
                  selectedPreset.kind === "number" ? "numeric" : undefined
                }
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                {selectedPreset.hint}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs leading-relaxed">
              Choose which field is wrong, then enter the value exactly as shown
              on the certificate. Leave blank until you&apos;re ready to save.
            </p>
          )}

          <Button
            variant={needsAttention ? "default" : "outline"}
            className="w-full sm:w-auto"
            onClick={() => void saveCorrection()}
            disabled={!canSaveCorrection}
          >
            {busy === "correct"
              ? "Saving & re-checking…"
              : "Save correction & re-check"}
          </Button>
        </section>

        {/* 2. Publish reviewed verdict */}
        <section
          className="space-y-3 border-t pt-5"
          aria-labelledby="publish-heading"
        >
          <div>
            <h3 id="publish-heading" className="text-sm font-semibold">
              2. Publish reviewed verdict
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              After you verify the PDF, publish so the customer can accept or
              override. This never auto-approves compliance.
            </p>
          </div>

          <Button
            variant={needsAttention ? "outline" : "default"}
            className="w-full sm:w-auto"
            onClick={() => void publish()}
            disabled={busy !== null}
          >
            {busy === "publish"
              ? "Publishing…"
              : needsAttention
                ? "Publish for customer review"
                : "Publish reviewed verdict"}
          </Button>
        </section>

        <p className="text-muted-foreground text-xs leading-relaxed">
          {DISCLAIMER}
        </p>
        {msg ? (
          <p
            className="text-foreground bg-muted/40 rounded-md px-3 py-2 text-xs leading-relaxed"
            role="status"
          >
            {msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
