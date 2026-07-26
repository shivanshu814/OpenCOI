import { Badge } from "@/components/ui/badge";
import type { DocumentPipelineStatus } from "@/lib/data/types";
import type { VendorStatus } from "@/lib/demo/store";
import type { Verdict } from "@/lib/requirements/engine";
import { cn } from "@/lib/utils";

const vendorTone: Record<
  VendorStatus,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  compliant: {
    label: "Compliant",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  expiring: {
    label: "Expiring ≤30d",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-400",
    pulse: true,
  },
  non_compliant: {
    label: "Non-compliant",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
    pulse: true,
  },
  missing_docs: {
    label: "Missing docs",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
    pulse: true,
  },
  in_review: {
    label: "Internal review",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
    pulse: true,
  },
};

const verdictTone: Record<
  Verdict,
  { className: string; dot: string; pulse?: boolean }
> = {
  PASS: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  FAIL: {
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
    pulse: true,
  },
  MISSING: {
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
    pulse: true,
  },
  EXPIRING: {
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-400",
    pulse: true,
  },
};

function StatusDot({
  className,
  pulse,
}: {
  className: string;
  pulse?: boolean;
}) {
  if (!pulse) {
    return <span className={cn("size-1.5 rounded-full", className)} />;
  }
  return (
    <span className="relative flex size-1.5">
      <span
        className={cn(
          "absolute inline-flex size-full animate-ping rounded-full opacity-40",
          className,
        )}
      />
      <span
        className={cn("relative inline-flex size-1.5 rounded-full", className)}
      />
    </span>
  );
}

const pipelineTone: Record<
  DocumentPipelineStatus,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  uploaded: {
    label: "Uploaded",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
    pulse: true,
  },
  extracted: {
    label: "Extracted",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
    pulse: true,
  },
  checked: {
    label: "Checked",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
    pulse: true,
  },
  in_internal_review: {
    label: "Internal review",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
    pulse: true,
  },
  published: {
    label: "Awaiting your decision",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-400",
    pulse: true,
  },
  accepted: {
    label: "Accepted",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  overridden: {
    label: "Overridden",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  disputed: {
    label: "Disputed",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
    pulse: true,
  },
  extraction_failed: {
    label: "Extraction failed",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
    pulse: true,
  },
};

export function DocumentStatusBadge({
  status,
}: {
  status: DocumentPipelineStatus;
}) {
  const t = pipelineTone[status];
  return (
    <Badge className={cn("gap-1.5 font-medium", t.className)}>
      <StatusDot className={t.dot} pulse={t.pulse} />
      {t.label}
    </Badge>
  );
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const t = vendorTone[status];
  return (
    <Badge className={cn("gap-1.5 font-medium", t.className)}>
      <StatusDot className={t.dot} pulse={t.pulse} />
      {t.label}
    </Badge>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const t = verdictTone[verdict];
  return (
    <Badge className={cn("gap-1.5 font-semibold tracking-wide", t.className)}>
      <StatusDot className={t.dot} pulse={t.pulse} />
      {verdict}
    </Badge>
  );
}
