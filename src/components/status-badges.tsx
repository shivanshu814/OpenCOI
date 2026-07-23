import { Badge } from "@/components/ui/badge";
import type { VendorStatus } from "@/lib/demo/store";
import type { Verdict } from "@/lib/requirements/engine";

const vendorTone: Record<VendorStatus, { label: string; className: string }> = {
  compliant: {
    label: "Compliant",
    className: "bg-emerald-100 text-emerald-900 border-transparent",
  },
  expiring: {
    label: "Expiring ≤30d",
    className: "bg-amber-100 text-amber-950 border-transparent",
  },
  non_compliant: {
    label: "Non-compliant",
    className: "bg-red-100 text-red-900 border-transparent",
  },
  missing_docs: {
    label: "Missing docs",
    className: "bg-slate-100 text-slate-800 border-transparent",
  },
  in_review: {
    label: "Internal review",
    className: "bg-sky-100 text-sky-950 border-transparent",
  },
};

const verdictTone: Record<Verdict, string> = {
  PASS: "bg-emerald-100 text-emerald-900 border-transparent",
  FAIL: "bg-red-100 text-red-900 border-transparent",
  MISSING: "bg-slate-100 text-slate-800 border-transparent",
  EXPIRING: "bg-amber-100 text-amber-950 border-transparent",
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const t = vendorTone[status];
  return <Badge className={t.className}>{t.label}</Badge>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge className={verdictTone[verdict]}>{verdict}</Badge>;
}
