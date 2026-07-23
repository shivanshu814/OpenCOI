"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Vendor } from "@/lib/data/types";
import { FileText, FileUp, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vendorOptions = useMemo(() => vendors, [vendors]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !vendorId) return;
    setBusy(true);
    setMsg(null);
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
        reviewPath?: string;
        queued?: boolean;
      };
      if (!res.ok) {
        setMsg(data.error ?? "Upload failed");
        return;
      }
      if (data.demo) {
        setMsg(data.message ?? "Demo mode");
        return;
      }
      setMsg(
        data.queued
          ? "Uploaded — extraction queued. Opening review…"
          : "Uploaded (status: uploaded). Set OPENROUTER_API_KEY or run Inngest to extract.",
      );
      if (data.reviewPath) {
        router.push(data.reviewPath);
        router.refresh();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <form
        onSubmit={onSubmit}
        className="bg-card space-y-5 rounded-xl border p-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="vendor">Vendor</Label>
          <select
            id="vendor"
            className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select vendor
            </option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="file">Certificate (PDF, PNG, or JPEG)</Label>
          <div
            className={`relative rounded-xl border border-dashed transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/40 bg-muted/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
          >
            {file ? (
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md"
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="file"
                className="flex cursor-pointer flex-col items-center gap-1.5 px-4 py-8 text-center"
              >
                <FileUp
                  className="text-muted-foreground size-6"
                  aria-hidden
                />
                <span className="text-sm font-medium">
                  Drop the COI here, or browse
                </span>
                <span className="text-muted-foreground text-xs">
                  ACORD 25 works best — we read limits, expirations, and
                  endorsements
                </span>
              </label>
            )}
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              required={!file}
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={busy || !file || !vendorId}
        >
          {busy ? "Uploading…" : "Queue extraction"}
        </Button>
        {msg ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{msg}</p>
        ) : null}
      </form>

      <aside className="space-y-4 lg:pt-1">
        <h2 className="text-sm font-semibold">What happens next</h2>
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
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
