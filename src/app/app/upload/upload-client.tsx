"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Vendor } from "@/lib/data/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function UploadPage({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const search = useSearchParams();
  const preselected = search.get("vendor") ?? "";
  const [vendorId, setVendorId] = useState(preselected);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload COI</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Web upload path (email-in lands Week 2). Endorsement checks run on
          every extract.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="vendor">Vendor</Label>
          <select
            id="vendor"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
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
          <Label htmlFor="file">PDF</Label>
          <Input
            id="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Uploading…" : "Queue extraction"}
        </Button>
        {msg ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{msg}</p>
        ) : null}
      </form>
    </div>
  );
}
