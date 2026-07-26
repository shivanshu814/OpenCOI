"use client";

import { Button } from "@/components/ui/button";
import {
  notifyApiError,
  notifyCaughtError,
  notifyInfo,
} from "@/lib/ui/toast";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunExtractionButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/extract`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        alreadyExtracted?: boolean;
        error?: string;
      };
      if (!res.ok) {
        // Persistent failure belongs on the page via refresh/pipeline; toast once.
        notifyApiError(data, "Extraction failed");
        return;
      }
      notifyInfo(
        data.alreadyExtracted
          ? "Already read — loading the review…"
          : "Extraction finished — loading verdict…",
      );
      router.refresh();
    } catch (err) {
      notifyCaughtError(err, "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" onClick={run} disabled={busy} className="w-full">
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      {busy ? "Reading certificate…" : "Run extraction now"}
    </Button>
  );
}
