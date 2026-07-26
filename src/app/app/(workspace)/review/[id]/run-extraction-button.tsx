"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunExtractionButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/extract`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Extraction failed");
        return;
      }
      setMsg("Extraction complete — loading verdict…");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {busy ? "Reading certificate…" : "Run extraction now"}
      </Button>
      {msg ? (
        <p
          className="text-muted-foreground text-xs leading-relaxed"
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
