"use client";

import { CertShieldMark } from "@/components/certshield-logo";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  FileText,
  Lock,
  Mail,
  Search,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type PreviewVendor = {
  vendor: string;
  trade: string;
  detail: string;
  status: string;
  initials: string;
  badge: string;
  dot: string;
  avatar: string;
};

export const DEMO_PREVIEW_VENDORS: PreviewVendor[] = [
  {
    vendor: "Summit Roofing LLC",
    trade: "Roofing",
    detail: "GL + WC verified",
    status: "Compliant",
    initials: "SR",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    dot: "bg-emerald-500",
    avatar: "from-emerald-400/20 to-emerald-600/10 text-emerald-700",
  },
  {
    vendor: "Northside HVAC",
    trade: "HVAC",
    detail: "GL expires in 21 days",
    status: "Expiring",
    initials: "NH",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/15",
    dot: "bg-amber-400",
    avatar: "from-amber-400/20 to-amber-600/10 text-amber-800",
  },
  {
    vendor: "Apex Plumbing Co.",
    trade: "Plumbing",
    detail: "Limit below requirement",
    status: "Flagged",
    initials: "AP",
    badge: "bg-red-50 text-red-700 ring-red-600/15",
    dot: "bg-red-500",
    avatar: "from-red-400/20 to-red-600/10 text-red-700",
  },
  {
    vendor: "Greenway Landscape",
    trade: "Landscaping",
    detail: "Chase sent · awaiting COI",
    status: "Missing",
    initials: "GL",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dot: "bg-slate-400",
    avatar: "from-slate-300/40 to-slate-400/20 text-slate-600",
  },
];

export const DEMO_CERT_ROWS = [
  { field: "GL each occurrence", value: "$1,000,000", ok: true, conf: 98 },
  { field: "GL general aggregate", value: "$2,000,000", ok: true, conf: 97 },
  { field: "Expiration date", value: "04/12/2027", ok: true, conf: 99 },
  {
    field: "Additional insured — CG 20 10",
    value: "Attached",
    ok: true,
    conf: 94,
  },
  {
    field: "Additional insured — CG 20 37",
    value: "Not found",
    ok: false,
    conf: 91,
  },
  { field: "Waiver of subrogation", value: "Included", ok: true, conf: 96 },
] as const;

const LIVE_EVENTS = [
  { text: "Chase sent · Greenway Landscape", tone: "brand" },
  { text: "COI uploaded · Summit Roofing", tone: "ok" },
  { text: "Agent confirm requested · Apex", tone: "warn" },
  { text: "Review queue · 1 field flagged", tone: "bad" },
  { text: "Renewal reminder · Northside HVAC", tone: "warn" },
  { text: "Portal opened · Greenway · just now", tone: "brand" },
  { text: "Verdict published · Summit Roofing", tone: "ok" },
] as const;

const TOASTS = [
  {
    title: "Chase delivered",
    body: "EN email · Greenway Landscape",
    icon: "mail",
  },
  {
    title: "COI received",
    body: "Summit Roofing · queued for review",
    icon: "upload",
  },
  {
    title: "Flag needs review",
    body: "CG 20 37 missing · Apex Plumbing",
    icon: "flag",
  },
  {
    title: "Agent replied",
    body: "Confirm link opened · 14s ago",
    icon: "mail",
  },
] as const;

const GREENWAY_CYCLE = [
  { detail: "Chase sent · awaiting COI", status: "Missing" },
  { detail: "Portal opened · just now", status: "Chasing" },
  { detail: "Agent forwarded request", status: "Chasing" },
  { detail: "PDF uploading…", status: "Uploading" },
  { detail: "In review queue", status: "Review" },
] as const;

const NORTHSIDE_DAYS = [21, 20, 19, 21] as const;

const SEARCH_QUERIES = [
  "Summit Roof",
  "Apex Plumb",
  "expiring",
  "Greenway",
] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCountUp(target: number, durationMs = 1100, enabled = true) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced || !enabled ? target : 0);

  useEffect(() => {
    if (!enabled || reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, enabled, reduced]);

  return value;
}

function useInterval(callback: () => void, ms: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (ms === null) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

function statusStyles(status: string) {
  switch (status) {
    case "Compliant":
      return {
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
        dot: "bg-emerald-500",
      };
    case "Expiring":
      return {
        badge: "bg-amber-50 text-amber-700 ring-amber-600/15",
        dot: "bg-amber-400",
      };
    case "Flagged":
      return {
        badge: "bg-red-50 text-red-700 ring-red-600/15",
        dot: "bg-red-500",
      };
    case "Chasing":
    case "Uploading":
      return {
        badge: "bg-sky-50 text-sky-700 ring-sky-600/15",
        dot: "bg-sky-500",
      };
    case "Review":
      return {
        badge: "bg-violet-50 text-violet-700 ring-violet-600/15",
        dot: "bg-violet-500",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-600 ring-slate-500/15",
        dot: "bg-slate-400",
      };
  }
}

function PreviewChrome({
  title = "app.getcertshield.app/app",
  liveClock,
}: {
  title?: string;
  liveClock?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80 px-3.5 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_-0.5px_1px_rgba(0,0,0,0.2)]" />
        <span className="size-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_-0.5px_1px_rgba(0,0,0,0.2)]" />
        <span className="size-2.5 rounded-full bg-[#28c840] shadow-[inset_0_-0.5px_1px_rgba(0,0,0,0.2)]" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 shadow-xs">
        <Lock className="size-3 shrink-0 text-slate-400" />
        <span className="truncate text-[11px] font-medium tracking-wide text-slate-500">
          {title}
        </span>
      </div>
      {liveClock ? (
        <span className="hidden shrink-0 items-center gap-1 text-[10px] font-medium tabular-nums text-slate-400 sm:inline-flex">
          <span className="bg-brand size-1.5 animate-pulse rounded-full" />
          {liveClock}
        </span>
      ) : null}
    </div>
  );
}

/** Circular score ring used in marketing previews + app dashboard. */
export function ScoreRing({
  score,
  size = "md",
  animate = true,
  pulse = false,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  /** Soft glow — marketing previews only */
  pulse?: boolean;
}) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const clamped = useCountUp(target, 900, animate);
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const box =
    size === "lg" ? "size-20" : size === "sm" ? "size-16" : "size-[4.5rem]";
  const num =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  const unit = size === "lg" ? "text-xs" : "text-[10px]";
  const stroke = size === "sm" ? 6 : 5.5;

  return (
    <div
      className={cn(
        "relative shrink-0",
        box,
        pulse && "cs-glow-pulse rounded-full",
      )}
      role="img"
      aria-label={`Compliance score ${target} percent`}
    >
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-100"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-brand transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "text-foreground flex items-baseline gap-px leading-none font-semibold tabular-nums",
            num,
          )}
        >
          {clamped}
          <span className={cn("font-semibold text-slate-400", unit)}>%</span>
        </span>
      </div>
    </div>
  );
}

function PreviewShell({
  children,
  className,
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      {glow ? (
        <>
          <div className="bg-brand/30 absolute -inset-8 rounded-[2.5rem] blur-3xl" />
          <div
            aria-hidden
            className="absolute inset-x-3 top-3 bottom-0 translate-y-2 rounded-2xl border border-white/10 bg-white/40 shadow-xl"
          />
          <div
            aria-hidden
            className="absolute inset-x-1.5 top-1.5 bottom-0 translate-y-1 rounded-2xl border border-white/15 bg-white/70 shadow-xl"
          />
        </>
      ) : null}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_28px_90px_-18px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </div>
  );
}

function LiveSearchSim({ enabled }: { enabled: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [qIdx, setQIdx] = useState(0);
  const query = SEARCH_QUERIES[qIdx];
  const [typed, setTyped] = useState(enabled && !reduced ? "" : query);
  const [phase, setPhase] = useState<"type" | "hold" | "clear">("type");

  useEffect(() => {
    if (!enabled || reduced) {
      setTyped(query);
      return;
    }

    let timer: number;
    if (phase === "type") {
      if (typed.length < query.length) {
        timer = window.setTimeout(
          () => setTyped(query.slice(0, typed.length + 1)),
          55 + Math.random() * 45,
        );
      } else {
        timer = window.setTimeout(() => setPhase("hold"), 1100);
      }
    } else if (phase === "hold") {
      timer = window.setTimeout(() => setPhase("clear"), 250);
    } else if (typed.length > 0) {
      timer = window.setTimeout(() => setTyped(typed.slice(0, -1)), 28);
    } else {
      timer = window.setTimeout(() => {
        setQIdx((i) => (i + 1) % SEARCH_QUERIES.length);
        setPhase("type");
      }, 500);
    }
    return () => window.clearTimeout(timer);
  }, [enabled, reduced, phase, typed, query]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5">
      <Search className="size-3.5 shrink-0 text-slate-400" />
      <span className="min-w-0 truncate text-xs text-slate-600">
        {typed || <span className="text-slate-400">Search vendors…</span>}
        {enabled && !reduced && phase === "type" ? (
          <span className="bg-brand ml-px inline-block h-3 w-px animate-pulse align-middle" />
        ) : null}
      </span>
    </div>
  );
}

type PortfolioPreviewProps = {
  className?: string;
  compact?: boolean;
  glow?: boolean;
  chromeTitle?: string;
  live?: boolean;
};

/** Decorative portfolio dashboard used on marketing + login. */
export function PortfolioPreviewCard({
  className,
  compact = false,
  glow = true,
  chromeTitle,
  live = true,
}: PortfolioPreviewProps) {
  const reduced = usePrefersReducedMotion();
  const sim = live && !reduced;
  const baseRows = compact
    ? DEMO_PREVIEW_VENDORS.slice(0, 3)
    : DEMO_PREVIEW_VENDORS;

  const [eventIdx, setEventIdx] = useState(0);
  const [toastIdx, setToastIdx] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [greenIdx, setGreenIdx] = useState(0);
  const [northDay, setNorthDay] = useState(0);
  const [pulseVendor, setPulseVendor] = useState<string | null>(null);
  const [score, setScore] = useState(72);
  const [needsChase, setNeedsChase] = useState(1);
  const [barsReady, setBarsReady] = useState(!sim);
  const [uploadPulse, setUploadPulse] = useState(false);
  const [clock, setClock] = useState("12:04:18");
  const [scene, setScene] = useState(0);

  useEffect(() => {
    if (!sim) {
      setBarsReady(true);
      return;
    }
    const t = window.setTimeout(() => setBarsReady(true), 180);
    return () => window.clearTimeout(t);
  }, [sim]);

  // Live clock tick
  useInterval(
    () => {
      if (!sim) return;
      const d = new Date();
      d.setHours(12, 4, 18 + (scene % 40), 0);
      setClock(
        d.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    },
    sim ? 1000 : null,
  );

  useInterval(
    () => setEventIdx((i) => (i + 1) % LIVE_EVENTS.length),
    sim ? 2400 : null,
  );

  // Scene director — denser activity loop
  useInterval(
    () => {
      if (!sim) return;
      setScene((s) => {
        const next = (s + 1) % 10;
        switch (next) {
          case 0:
            setGreenIdx((i) => {
              const ni = (i + 1) % GREENWAY_CYCLE.length;
              const st = GREENWAY_CYCLE[ni].status;
              setNeedsChase(st === "Review" || st === "Uploading" ? 0 : 1);
              return ni;
            });
            setPulseVendor("Greenway Landscape");
            break;
          case 1:
            setShowToast(true);
            setToastIdx((i) => (i + 1) % TOASTS.length);
            setUploadPulse(true);
            break;
          case 2:
            setScore(73);
            setPulseVendor("Summit Roofing LLC");
            setUploadPulse(false);
            break;
          case 3:
            setNorthDay((i) => (i + 1) % NORTHSIDE_DAYS.length);
            setPulseVendor("Northside HVAC");
            break;
          case 4:
            setShowToast(true);
            setToastIdx((i) => (i + 1) % TOASTS.length);
            setPulseVendor("Apex Plumbing Co.");
            break;
          case 5:
            setScore(72);
            setGreenIdx((i) => {
              const ni = (i + 1) % GREENWAY_CYCLE.length;
              const st = GREENWAY_CYCLE[ni].status;
              setNeedsChase(st === "Review" || st === "Uploading" ? 0 : 1);
              return ni;
            });
            setPulseVendor("Greenway Landscape");
            break;
          case 6:
            setShowToast(false);
            setPulseVendor(null);
            break;
          case 7:
            setShowToast(true);
            setToastIdx((i) => (i + 1) % TOASTS.length);
            break;
          case 8:
            setPulseVendor("Summit Roofing LLC");
            setScore(74);
            break;
          default:
            setScore(72);
            setShowToast(false);
            setPulseVendor(null);
            setUploadPulse(false);
        }
        window.setTimeout(() => setPulseVendor(null), 1100);
        return next;
      });
    },
    sim ? 2200 : null,
  );

  const green = GREENWAY_CYCLE[greenIdx];
  const greenStyle = statusStyles(green.status);

  const rows = baseRows.map((row) => {
    if (row.vendor === "Greenway Landscape") {
      return {
        ...row,
        detail: green.detail,
        status: green.status,
        badge: greenStyle.badge,
        dot: greenStyle.dot,
      };
    }
    if (row.vendor === "Northside HVAC") {
      return {
        ...row,
        detail: `GL expires in ${NORTHSIDE_DAYS[northDay]} days`,
      };
    }
    return row;
  });

  const toast = TOASTS[toastIdx];
  const event = LIVE_EVENTS[eventIdx];

  return (
    <PreviewShell className={className} glow={glow}>
      <PreviewChrome title={chromeTitle} liveClock={sim ? clock : null} />

      {!compact ? (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
          <LiveSearchSim enabled={sim} />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-shadow",
              uploadPulse && "cs-glow-pulse ring-2 ring-brand/40",
            )}
          >
            <Upload className="size-3" strokeWidth={2.25} />
            Upload COI
          </span>
        </div>
      ) : null}

      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-5 py-4">
        {sim ? (
          <div
            aria-hidden
            className="cs-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-brand/15 to-transparent"
          />
        ) : null}
        <div
          aria-hidden
          className="bg-brand/15 absolute -top-8 -right-6 size-28 rounded-full blur-2xl"
        />
        <div className="relative flex items-center gap-3.5">
          <ScoreRing
            score={score}
            size={compact ? "sm" : "md"}
            animate={live}
            pulse={sim}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                {compact ? "Compliance" : "Portfolio compliance"}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/15 ring-inset">
                <span className="relative flex size-1.5">
                  <span className="bg-emerald-500 absolute inline-flex size-full animate-ping rounded-full opacity-40" />
                  <span className="bg-emerald-500 relative inline-flex size-1.5 rounded-full" />
                </span>
                Live
              </span>
            </div>
            <p className="text-foreground mt-1 text-sm font-semibold tabular-nums">
              {rows.length} vendors ·{" "}
              <span
                key={needsChase}
                className="animate-in fade-in zoom-in-95 inline-block duration-300"
              >
                {needsChase} needs chase
              </span>
            </p>
            <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-slate-100/90 ring-1 ring-slate-200/60 ring-inset">
              <div
                className="bg-emerald-500 transition-all duration-700 ease-out"
                style={{ width: barsReady ? "40%" : "0%" }}
              />
              <div
                className="bg-amber-400 transition-all delay-75 duration-700 ease-out"
                style={{ width: barsReady ? "20%" : "0%" }}
              />
              <div
                className="bg-red-500 transition-all delay-150 duration-700 ease-out"
                style={{ width: barsReady ? "20%" : "0%" }}
              />
              <div
                className="bg-slate-400 transition-all delay-200 duration-700 ease-out"
                style={{ width: barsReady ? "20%" : "0%" }}
              />
            </div>
            {!compact ? (
              <dl className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Compliant
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
                  Expiring
                </div>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  Flagged
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="relative">
        {rows.map((row, i) => {
          const active = pulseVendor === row.vendor;
          return (
            <li
              key={row.vendor}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 transition-all duration-300",
                i < rows.length - 1 && "border-b border-slate-100",
                active ? "bg-emerald-50/80" : "hover:bg-slate-50/80",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="bg-brand absolute top-0 bottom-0 left-0 w-0.5"
                />
              ) : null}
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold ring-1 ring-black/5 transition-transform duration-300",
                  row.avatar,
                  active && "scale-105 ring-brand/30",
                )}
              >
                {row.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {row.vendor}
                  </p>
                  {!compact ? (
                    <span className="hidden rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500 sm:inline">
                      {row.trade}
                    </span>
                  ) : null}
                </div>
                <p
                  key={`${row.vendor}-${row.detail}`}
                  className={cn(
                    "animate-in fade-in truncate text-xs duration-300",
                    active ? "text-emerald-700" : "text-slate-500",
                  )}
                >
                  {row.detail}
                </p>
              </div>
              <span
                key={`${row.vendor}-${row.status}`}
                className={cn(
                  "animate-in zoom-in-95 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset duration-300",
                  row.badge,
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    row.dot,
                    (row.status === "Missing" ||
                      row.status === "Chasing" ||
                      row.status === "Uploading") &&
                      sim &&
                      "animate-pulse",
                  )}
                />
                {row.status}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Floating toast */}
      {sim && showToast ? (
        <div
          key={toastIdx}
          className="cs-toast-in pointer-events-none absolute right-3 bottom-14 z-10 w-[min(100%-1.5rem,16rem)] rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-sm"
        >
          <div className="flex items-start gap-2.5">
            <span className="bg-brand-muted text-brand flex size-7 shrink-0 items-center justify-center rounded-lg">
              {toast.icon === "upload" ? (
                <Upload className="size-3.5" strokeWidth={2.25} />
              ) : toast.icon === "flag" ? (
                <span className="text-[10px] font-bold">!</span>
              ) : (
                <Mail className="size-3.5" strokeWidth={2.25} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">
                {toast.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {toast.body}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/30 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span className="relative flex size-1.5 shrink-0">
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-40",
                event.tone === "ok"
                  ? "bg-emerald-500"
                  : event.tone === "bad"
                    ? "bg-red-500"
                    : event.tone === "warn"
                      ? "bg-amber-400"
                      : "bg-brand",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-1.5 rounded-full",
                event.tone === "ok"
                  ? "bg-emerald-500"
                  : event.tone === "bad"
                    ? "bg-red-500"
                    : event.tone === "warn"
                      ? "bg-amber-400"
                      : "bg-brand",
              )}
            />
          </span>
          <span
            key={eventIdx}
            className="animate-in fade-in slide-in-from-bottom-1 truncate duration-300"
          >
            {sim ? event.text : "Live dashboard preview"}
          </span>
        </span>
        <span className="text-brand inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold">
          Review queue
          <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </PreviewShell>
  );
}

/** Decorative ACORD extraction preview. */
export function ExtractionPreviewCard({
  className,
  glow = true,
  live = true,
}: {
  className?: string;
  glow?: boolean;
  live?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const sim = live && !reduced;
  const pass = DEMO_CERT_ROWS.filter((r) => r.ok).length;
  const fail = DEMO_CERT_ROWS.length - pass;

  const [visible, setVisible] = useState(sim ? 0 : DEMO_CERT_ROWS.length);
  const [phase, setPhase] = useState<"extracting" | "review">(
    sim ? "extracting" : "review",
  );
  const [filled, setFilled] = useState(!sim);
  const [scanRow, setScanRow] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);

  useEffect(() => {
    if (!sim) {
      setVisible(DEMO_CERT_ROWS.length);
      setPhase("review");
      setFilled(true);
      return;
    }

    if (visible < DEMO_CERT_ROWS.length) {
      setPhase("extracting");
      setScanRow(visible);
      const t = window.setTimeout(
        () => {
          setVisible((v) => v + 1);
          setFilled(true);
          setLatencyMs((ms) => ms + 180 + Math.floor(Math.random() * 90));
        },
        visible === 0 ? 280 : 380,
      );
      return () => window.clearTimeout(t);
    }

    setPhase("review");
    setScanRow(-1);
    const restart = window.setTimeout(() => {
      setVisible(0);
      setFilled(false);
      setPhase("extracting");
      setLatencyMs(0);
      setScanRow(0);
    }, 3200);
    return () => window.clearTimeout(restart);
  }, [sim, visible]);

  const progress = Math.round((visible / DEMO_CERT_ROWS.length) * 100);

  return (
    <PreviewShell className={className} glow={glow}>
      <PreviewChrome title="app.getcertshield.app/app/review" />

      {sim ? (
        <div className="h-0.5 w-full bg-slate-100">
          <div
            className="bg-brand h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 px-5 py-4">
        {phase === "extracting" && sim ? (
          <div aria-hidden className="cs-shimmer absolute inset-0 opacity-60" />
        ) : null}
        <div
          aria-hidden
          className="absolute -top-6 -right-4 size-24 rounded-full bg-amber-400/20 blur-2xl"
        />
        <div className="relative flex items-start gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs ring-1 ring-slate-200/80">
            <FileText className="text-brand size-5" strokeWidth={1.75} />
            {phase === "extracting" ? (
              <span className="border-brand absolute -right-0.5 -bottom-0.5 size-3 animate-spin rounded-full border-2 border-t-transparent" />
            ) : (
              <span className="absolute -right-0.5 -bottom-0.5 flex size-3 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-2" strokeWidth={3} />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                Certificate of liability insurance
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                  phase === "extracting"
                    ? "bg-sky-50 text-sky-700 ring-sky-600/15"
                    : "bg-amber-50 text-amber-700 ring-amber-600/15",
                )}
              >
                <span className="relative flex size-1.5">
                  <span
                    className={cn(
                      "absolute inline-flex size-full animate-ping rounded-full opacity-40",
                      phase === "extracting" ? "bg-sky-400" : "bg-amber-400",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex size-1.5 rounded-full",
                      phase === "extracting" ? "bg-sky-400" : "bg-amber-400",
                    )}
                  />
                </span>
                {phase === "extracting" ? "Extracting" : "In review"}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              Summit Roofing LLC · ACORD 25
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-emerald-600/15 ring-inset">
                {Math.min(visible, pass)} passed
              </span>
              <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-red-700 ring-1 ring-red-600/15 ring-inset">
                {visible > 4 ? fail : 0} flagged
              </span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 tabular-nums text-slate-600 ring-1 ring-slate-500/10 ring-inset">
                {phase === "extracting"
                  ? `${latencyMs || 40}ms`
                  : "Avg confidence 96%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <dl className="relative">
        {DEMO_CERT_ROWS.map((row, i) => {
          const shown = i < visible;
          const scanning = sim && scanRow === i && phase === "extracting";
          return (
            <div
              key={row.field}
              className={cn(
                "group relative flex items-center justify-between gap-3 px-5 py-2.5 transition-all duration-300",
                i < DEMO_CERT_ROWS.length - 1 && "border-b border-slate-100",
                shown
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-20",
                scanning && "bg-sky-50/80",
              )}
            >
              {scanning ? (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-0.5 bg-sky-400"
                />
              ) : null}
              <dt className="min-w-0 flex-1">
                <p className="text-sm text-slate-600">{row.field}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 max-w-[4.5rem] flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        row.ok ? "bg-brand" : "bg-red-400",
                      )}
                      style={{
                        width: shown && filled ? `${row.conf}%` : "0%",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium tabular-nums text-slate-400">
                    {shown ? `${row.conf}%` : scanning ? "…" : "—"}
                  </span>
                </div>
              </dt>
              <dd className="flex shrink-0 items-center gap-2 text-sm font-semibold tabular-nums text-slate-800">
                {shown ? (
                  <span className="animate-in fade-in duration-300">
                    {row.value}
                  </span>
                ) : scanning ? (
                  <span className="cs-shimmer h-3 w-16 rounded bg-slate-100" />
                ) : (
                  "…"
                )}
                {shown ? (
                  row.ok ? (
                    <span className="bg-brand-muted text-brand animate-in zoom-in-50 flex size-5 items-center justify-center rounded-full ring-1 ring-brand/20 duration-300">
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="animate-in zoom-in-50 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-700 uppercase ring-1 ring-red-600/15 ring-inset duration-300">
                      Flag
                    </span>
                  )
                ) : (
                  <span className="size-5 rounded-full bg-slate-100" />
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="flex items-center justify-between border-t border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <CertShieldMark size={14} />
          {phase === "extracting"
            ? `Reading fields · ${visible}/${DEMO_CERT_ROWS.length}`
            : "Ready for founder review"}
        </span>
        <span
          className={cn(
            "text-brand inline-flex items-center gap-1 text-[11px] font-semibold transition-opacity",
            phase === "review" ? "opacity-100" : "opacity-40",
          )}
        >
          Approve &amp; publish
          <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </PreviewShell>
  );
}
