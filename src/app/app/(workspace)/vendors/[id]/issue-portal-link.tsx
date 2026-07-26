"use client";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/ui/clipboard";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
} from "@/lib/ui/toast";
import { useState } from "react";

export function IssuePortalLinkButton({ vendorId }: { vendorId: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/portal-link`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        notifyApiError(data, "Could not issue portal link");
        return;
      }
      const next = data.url ?? null;
      setUrl(next);
      if (next) {
        // The link is always shown below, so a blocked clipboard is not a
        // failure — say what actually happened either way.
        const copied = await copyToClipboard(next, {
          successMessage: null,
          errorMessage: null,
        });
        notifySuccess(
          copied
            ? "Portal magic link copied"
            : "Portal link ready — copy it from below",
        );
      }
    } catch (e) {
      notifyCaughtError(e, "Could not issue portal link");
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
        {busy
          ? "Issuing…"
          : url
            ? "Copied — issue again"
            : "Copy portal magic link"}
      </Button>
      {url ? (
        <p className="bg-muted/40 text-muted-foreground rounded-lg border px-2.5 py-2 font-mono text-xs leading-relaxed break-all">
          {url}
        </p>
      ) : null}
    </div>
  );
}
