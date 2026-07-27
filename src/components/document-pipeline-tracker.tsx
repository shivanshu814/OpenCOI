"use client";

import { LiveDot, type LiveTone } from "@/components/live-activity";
import type { DocumentPipelineStatus } from "@/lib/data/types";
import { useLiveEvent } from "@/lib/live/use-live";
import type { LiveTable } from "@/lib/live/tables";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Module-level so the identity is stable and the subscription is not reopened. */
const PIPELINE_TABLES: readonly LiveTable[] = ["documents", "compliance_checks"];

type Stage = {
  key: string;
  label: string;
  /** Live line shown while this stage is the active one. */
  activeText: string;
};

const STAGES: Stage[] = [
  { key: "uploaded", label: "Uploaded", activeText: "PDF received — waiting for AI extraction" },
  { key: "extraction", label: "AI extraction", activeText: "Reading limits, dates, and endorsements…" },
  { key: "checks", label: "Requirements check", activeText: "Comparing lines against vendor requirements…" },
  { key: "internal_review", label: "Internal review", activeText: "A human is verifying the verdict before publish" },
  { key: "published", label: "Published", activeText: "Verdict published — awaiting your accept / override" },
  { key: "decision", label: "Your decision", activeText: "Decision recorded in the audit trail" },
];

/** Map pipeline status → index of the stage currently in progress. */
function activeStageIndex(status: DocumentPipelineStatus): number {
  switch (status) {
    case "uploaded":
      return 1; // extraction is what's running/next
    case "extracted":
      return 2;
    case "checked":
    case "in_internal_review":
      return 3;
    case "published":
      return 5; // waiting on the customer decision
    case "accepted":
    case "overridden":
    case "disputed":
      return STAGES.length; // everything done
    case "extraction_failed":
      return 1; // failed at extraction
  }
}

const DECISION_LABEL: Partial<Record<DocumentPipelineStatus, string>> = {
  accepted: "Accepted",
  overridden: "Overridden",
  disputed: "Disputed",
};

/**
 * Live pipeline strip for a document: shows every stage, pulses the one in
 * progress, and (optionally) polls so the page updates without a manual
 * refresh while extraction/checks run in the background.
 */
export function DocumentPipelineTracker({
  status,
  className,
}: {
  status: DocumentPipelineStatus;
  className?: string;
}) {
  const router = useRouter();
  const failed = status === "extraction_failed";
  const activeIdx = activeStageIndex(status);
  const allDone = activeIdx >= STAGES.length;

  // The pipeline is still moving on the server (upload → extraction → checks
  // land via Inngest in prod), so this is the one screen where someone is
  // actively watching and waiting.
  const polling = status === "uploaded" || status === "extracted";
  const [secs, setSecs] = useState(0);

  // Realtime is the primary signal now — the row flips the moment the job
  // writes it, instead of up to 5s later. The interval stays as a fail-soft
  // backstop but can be slower, which is 3x fewer server renders per wait.
  useLiveEvent(polling ? PIPELINE_TABLES : null, () => router.refresh());

  useEffect(() => {
    if (!polling) return;
    const tick = window.setInterval(() => setSecs((s) => s + 1), 1000);
    const poll = window.setInterval(() => router.refresh(), 15000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [polling, router]);

  const activeStage = STAGES[Math.min(activeIdx, STAGES.length - 1)];
  const liveTone: LiveTone = failed ? "bad" : allDone ? "ok" : "info";
  const liveText = failed
    ? "Extraction failed — retry below or upload a clearer PDF"
    : allDone
      ? `Complete — ${DECISION_LABEL[status] ?? "decision recorded"} · audit trail updated`
      : activeStage.activeText;

  return (
    <div
      className={cn(
        "border-border bg-card overflow-hidden rounded-xl border",
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 px-4 py-3">
        {STAGES.map((stage, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx && !allDone;
          const currentFailed = current && failed;
          return (
            <li key={stage.key} className="flex items-center gap-1">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap",
                  done && "text-emerald-700",
                  current && !currentFailed && "bg-sky-50 text-sky-700 ring-1 ring-sky-600/15",
                  currentFailed && "bg-red-50 text-red-700 ring-1 ring-red-600/15",
                  !done && !current && "text-muted-foreground/60",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? (
                  <Check className="size-3.5 text-emerald-600" strokeWidth={3} aria-hidden />
                ) : currentFailed ? (
                  <X className="size-3.5" strokeWidth={3} aria-hidden />
                ) : current ? (
                  <LiveDot tone="info" />
                ) : (
                  <span className="bg-muted-foreground/30 size-1.5 rounded-full" aria-hidden />
                )}
                {stage.label}
              </span>
              {i < STAGES.length - 1 ? (
                <span
                  className={cn(
                    "h-px w-3 sm:w-5",
                    i < activeIdx ? "bg-emerald-400" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div
        className={cn(
          "border-border/70 flex items-center gap-2 border-t px-4 py-2 text-xs",
          failed ? "bg-red-50/50" : "bg-muted/30",
        )}
        aria-live="polite"
      >
        <LiveDot tone={liveTone} />
        <span
          className={cn(
            "truncate font-medium",
            failed ? "text-red-700" : "text-muted-foreground",
          )}
        >
          {liveText}
        </span>
        {polling ? (
          <span className="text-muted-foreground/60 ml-auto shrink-0 tabular-nums">
            live · checking every 5s · {secs}s
          </span>
        ) : null}
      </div>
    </div>
  );
}
