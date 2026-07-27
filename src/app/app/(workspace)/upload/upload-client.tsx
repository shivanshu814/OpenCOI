"use client";

import { CardLiveAccent, LiveBadge, LiveDot } from "@/components/live-activity";
import { SampleCoiPicker } from "@/components/sample-coi-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/ui/file-dropzone";
import type { Vendor } from "@/lib/data/types";
import {
  notifyApiError,
  notifyCaughtError,
  notifyInfo,
  notifyWarning,
} from "@/lib/ui/toast";
import { ArrowRight, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const STEPS = [
  {
    title: "Extraction",
    body: "Limits, expiration dates, and endorsement forms are read from the certificate.",
  },
  {
    title: "Requirements check",
    body: "Each line is compared to the vendor's requirements — pass, fail, expiring, or missing.",
  },
  {
    title: "Review before publish",
    body: "Every verdict passes internal review before it reaches you. Low-confidence fields are flagged.",
  },
] as const;

export default function UploadPage({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const preselected = search.get("vendor") ?? "";
  const [vendorId, setVendorId] = useState(preselected);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const vendorItems = useMemo(
    () => vendors.map((v) => ({ label: v.name, value: v.id })),
    [vendors],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !vendorId) {
      setFormError(
        !vendorId ? "Select a vendor before uploading." : "Choose a certificate file.",
      );
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const form = new FormData();
      form.set("vendorId", vendorId);
      form.set("file", file);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        message?: string;
        error?: string;
        sla?: string;
        reviewPath?: string;
        queued?: boolean;
        extractionError?: string;
      };
      if (!res.ok) {
        const line = data.sla
          ? `${data.error ?? "Upload failed"} ${data.sla}`
          : (data.error ?? "Upload failed");
        setFormError(line);
        notifyApiError({ error: line }, "Upload failed");
        return;
      }
      if (data.demo) {
        setFormError(
          data.message ??
            "Demo mode — document not stored. Connect Supabase to upload live.",
        );
        notifyWarning(
          data.message ??
            "Demo mode — document not stored. Connect Supabase to upload live.",
        );
        return;
      }
      // Upload stored but AI extraction failed — say so honestly (never a
      // success toast) and land on the review page, which has the retry.
      if (data.extractionError) {
        notifyWarning(`Uploaded, but AI extraction failed. ${data.extractionError}`);
        if (data.reviewPath) {
          router.push(data.reviewPath);
          router.refresh();
        }
        return;
      }
      // Route change is the success signal — no duplicate toast.
      if (data.reviewPath) {
        router.push(data.reviewPath);
        router.refresh();
        return;
      }
      notifyInfo(
        data.queued
          ? "Uploaded — extraction queued"
          : "Uploaded. Set OPENROUTER_API_KEY or run Inngest to extract.",
      );
    } catch (err) {
      notifyCaughtError(err, "Upload failed");
      setFormError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form onSubmit={onSubmit}>
        <Card className="gap-0 overflow-hidden py-0">
          <CardLiveAccent />
          <CardContent className="space-y-5 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="vendor">Vendor</Label>
              {vendors.length === 0 ? (
                <div className="bg-muted/40 space-y-1.5 rounded-lg border border-dashed px-3.5 py-3">
                  <p className="text-sm font-medium">No vendors yet</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Every COI belongs to a vendor. Add one first — it takes ten
                    seconds — then come back to upload their certificate.
                  </p>
                  <Link
                    href="/app/vendors"
                    className="text-foreground inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                  >
                    Add a vendor
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                </div>
              ) : (
                <Select
                  items={vendorItems}
                  value={vendorId || null}
                  onValueChange={(value: string | null) =>
                    setVendorId(value ?? "")
                  }
                >
                  <SelectTrigger id="vendor" className="w-full">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorItems.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="file">Certificate (PDF, PNG, or JPEG)</Label>
              <FileDropzone
                id="file"
                value={file}
                onChange={(next) => {
                  setFile(next);
                  setFormError(null);
                }}
                accept="application/pdf,image/png,image/jpeg"
                onReject={(message) => {
                  setFormError(message);
                  notifyWarning(message);
                }}
                label="Drop the COI here, or browse"
                hint="ACORD 25 works best — we read limits, expiration dates, and endorsement forms."
              />
              <SampleCoiPicker
                onSelect={(sampleFile) => {
                  setFile(sampleFile);
                  setFormError(null);
                  notifyInfo(`Sample attached: ${sampleFile.name}`);
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              pending={busy}
              pendingIcon={Upload}
              pendingMotion="lift"
              disabled={busy || !file || !vendorId}
            >
              {busy ? "Uploading…" : "Queue extraction"}
            </Button>
            {formError ? (
              <p className="text-destructive text-xs leading-relaxed" role="alert">
                {formError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </form>

      <aside className="space-y-4 lg:pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">What happens next</h2>
          <LiveBadge label="Pipeline" tone="info" />
        </div>
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="bg-brand-muted text-brand relative flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums ring-1 ring-brand/15">
                {i === 0 ? (
                  <LiveDot className="absolute -top-0.5 -right-0.5" />
                ) : null}
                {i + 1}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
          Document review assistance — not legal, insurance, or professional
          advice.
        </p>
      </aside>
    </div>
  );
}
