"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export function IssuePortalLinkButton({ vendorId }: { vendorId: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/portal-link`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        setErr(data.error ?? "Failed");
        return;
      }
      setUrl(data.url ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={onClick}
      >
        {busy ? "Issuing…" : "Copy portal magic link"}
      </Button>
      {url ? (
        <p className="break-all rounded border bg-muted/30 p-2 font-mono text-xs">
          {url}
        </p>
      ) : null}
      {err ? <p className="text-destructive text-xs">{err}</p> : null}
    </div>
  );
}
