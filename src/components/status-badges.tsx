import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VendorStatus } from "@/lib/demo/store";
import type { Verdict } from "@/lib/requirements/engine";

const vendorTone: Record<
  VendorStatus,
  { label: string; className: string; dot: string }
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
  },
  non_compliant: {
    label: "Non-compliant",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
  },
  missing_docs: {
    label: "Missing docs",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  in_review: {
    label: "Internal review",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
};

const verdictTone: Record<Verdict, { className: string; dot: string }> = {
  PASS: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  FAIL: {
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
  },
  MISSING: {
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  EXPIRING: {
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-400",
  },
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const t = vendorTone[status];
  return (
    <Badge className={cn("gap-1.5 font-medium", t.className)}>
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {t.label}
    </Badge>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const t = verdictTone[verdict];
  return (
    <Badge className={cn("gap-1.5 font-semibold tracking-wide", t.className)}>
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      {verdict}
    </Badge>
  );
}
