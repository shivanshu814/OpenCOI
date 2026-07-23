"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const TONE_DOT: Record<string, string> = {
  brand: "bg-brand",
  ok: "bg-emerald-500",
  warn: "bg-amber-400",
  bad: "bg-red-500",
  info: "bg-sky-500",
};

export type LiveTone = keyof typeof TONE_DOT;

export function LiveDot({
  className,
  tone = "brand",
  ping = true,
}: {
  className?: string;
  tone?: LiveTone;
  ping?: boolean;
}) {
  const color = TONE_DOT[tone] ?? TONE_DOT.brand;
  return (
    <span className={cn("relative flex size-1.5 shrink-0", className)}>
      {ping ? (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-40",
            color,
          )}
        />
      ) : null}
      <span
        className={cn("relative inline-flex size-1.5 rounded-full", color)}
      />
    </span>
  );
}

export function LiveBadge({
  label = "Live",
  tone = "brand",
  className,
}: {
  label?: string;
  tone?: LiveTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset",
        tone === "ok" && "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
        tone === "warn" && "bg-amber-50 text-amber-700 ring-amber-600/15",
        tone === "info" && "bg-sky-50 text-sky-700 ring-sky-600/15",
        tone === "bad" && "bg-red-50 text-red-700 ring-red-600/15",
        (tone === "brand" || !tone) &&
          "bg-brand-muted text-brand ring-brand/20",
        className,
      )}
    >
      <LiveDot tone={tone} />
      {label}
    </span>
  );
}

/** Soft mint badge for dark/ink surfaces (marketing header, login). */
export function LiveBadgeOnDark({
  label = "Live",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/80 uppercase backdrop-blur-sm",
        className,
      )}
    >
      <LiveDot tone="brand" />
      {label}
    </span>
  );
}

type FeedItem = { text: string; tone: LiveTone };

const FEEDS: Record<string, FeedItem[]> = {
  "/app": [
    { text: "Portfolio health refreshed", tone: "ok" },
    { text: "Review queue checked", tone: "info" },
    { text: "Chase cadence idle · next window open", tone: "brand" },
    { text: "Audit trail append-only", tone: "brand" },
  ],
  "/app/review": [
    { text: "Extraction → internal review", tone: "info" },
    { text: "Corrections become golden-set cases", tone: "brand" },
    { text: "FAIL / low confidence never auto-approve", tone: "warn" },
    { text: "Waiting for next COI…", tone: "info" },
  ],
  "/app/upload": [
    { text: "ACORD 25 · PDF ready", tone: "brand" },
    { text: "Intake email listening", tone: "ok" },
    { text: "Sample COIs available for test", tone: "info" },
    { text: "Queue extraction on drop", tone: "brand" },
  ],
  "/app/vendors": [
    { text: "Vendor statuses live", tone: "ok" },
    { text: "Chase EN/ES ready", tone: "brand" },
    { text: "Portal links · no password", tone: "info" },
    { text: "SMS only after TCPA opt-in", tone: "warn" },
  ],
  "/app/properties": [
    { text: "Property requirements active", tone: "ok" },
    { text: "Certificate holder rules merged", tone: "brand" },
    { text: "Audit packs exportable", tone: "info" },
  ],
  "/app/projects": [
    { text: "GC project limits win on merge", tone: "brand" },
    { text: "Closeout pack ready when done", tone: "ok" },
    { text: "Subs tracked per job", tone: "info" },
  ],
  "/app/reports": [
    { text: "Owner reports · screenshot-ready", tone: "ok" },
    { text: "Compliance % from live statuses", tone: "brand" },
    { text: "Email via Resend when configured", tone: "info" },
  ],
  "/app/audit": [
    { text: "Append-only · nothing deleted", tone: "ok" },
    { text: "Documents · checks · messages logged", tone: "brand" },
    { text: "US-region data only", tone: "info" },
  ],
  "/app/settings/team": [
    { text: "Org-scoped membership", tone: "ok" },
    { text: "Roles: Admin · Manager · Read-only", tone: "brand" },
  ],
  "/app/settings/integrations": [
    { text: "API keys · cs_live_", tone: "brand" },
    { text: "Webhooks · document.published", tone: "info" },
  ],
  "/app/settings/billing": [
    { text: "Paddle merchant of record", tone: "ok" },
    { text: "Plans $99 / $249 / $499", tone: "brand" },
  ],
  "/app/admin": [
    { text: "AI cost · latency · confidence", tone: "info" },
    { text: "Golden-set accuracy gate", tone: "brand" },
    { text: "Internal review until M3", tone: "warn" },
  ],
  "/app/onboarding": [
    { text: "Setup wizard · almost live", tone: "info" },
    { text: "Templates → vendors → intake", tone: "brand" },
  ],
};

const DEMO_EXTRA: FeedItem[] = [
  { text: "Demo mode · connect Supabase for live data", tone: "warn" },
  { text: "Simulated workspace · sample vendors available", tone: "info" },
];

const MARKETING_FEED: FeedItem[] = [
  { text: "COI extracted · 6 fields", tone: "ok" },
  { text: "Chase email sent · EN + ES", tone: "brand" },
  { text: "Flag: CG 20 37 missing", tone: "warn" },
  { text: "Vendor portal opened", tone: "info" },
  { text: "Verdict published · audit trail", tone: "ok" },
  { text: "Agent confirm requested", tone: "brand" },
];

const PORTAL_FEED_EN: FeedItem[] = [
  { text: "No login required", tone: "ok" },
  { text: "Upload COI or forward to agent", tone: "brand" },
  { text: "Status updates automatically", tone: "info" },
];

const PORTAL_FEED_ES: FeedItem[] = [
  { text: "Sin contraseña", tone: "ok" },
  { text: "Suba el COI o reenvíe a su agente", tone: "brand" },
  { text: "El estado se actualiza solo", tone: "info" },
];

function feedForPath(pathname: string, demo: boolean): FeedItem[] {
  const base =
    FEEDS[pathname] ??
    Object.entries(FEEDS).find(
      ([key]) => key !== "/app" && pathname.startsWith(key),
    )?.[1] ??
    FEEDS["/app"];
  return demo ? [...DEMO_EXTRA, ...base] : base;
}

/** Path-aware status ticker for the app shell header. */
export function AppLiveTicker({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const items = feedForPath(pathname, demo);
  const [idx, setIdx] = useState(0);

  useInterval(
    () => setIdx((i) => (i + 1) % items.length),
    reduced ? null : 2800,
  );

  useEffect(() => {
    setIdx(0);
  }, [pathname]);

  const item = items[idx % items.length];

  return (
    <div
      className="border-border/70 bg-muted/40 hidden max-w-[min(100%,18rem)] items-center gap-2 truncate rounded-full border px-2.5 py-1 text-[11px] font-medium md:flex lg:max-w-xs"
      aria-live="polite"
    >
      <LiveDot tone={item.tone} />
      <span
        key={`${pathname}-${idx}`}
        className="text-muted-foreground animate-in fade-in slide-in-from-bottom-1 truncate duration-300"
      >
        {item.text}
      </span>
    </div>
  );
}

/** Compact page-level activity line under headers. */
export function PageLiveStrip({
  items,
  className,
}: {
  items: FeedItem[];
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  useInterval(
    () => setIdx((i) => (i + 1) % items.length),
    reduced || items.length < 2 ? null : 2600,
  );
  const item = items[idx % items.length];

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-xs",
        className,
      )}
      aria-live="polite"
    >
      <LiveDot tone={item.tone} />
      <span
        key={idx}
        className="animate-in fade-in slide-in-from-bottom-1 truncate duration-300"
      >
        {item.text}
      </span>
    </div>
  );
}

/** Floating ops ticker for marketing hero / dark panels. */
export function LiveOpsTicker({
  className,
  variant = "dark",
  items = MARKETING_FEED,
}: {
  className?: string;
  variant?: "dark" | "light";
  items?: FeedItem[];
}) {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [secs, setSecs] = useState(0);

  useInterval(
    () => setIdx((i) => (i + 1) % items.length),
    reduced ? null : 2200,
  );
  useInterval(() => setSecs((s) => s + 1), reduced ? null : 1000);

  const item = items[idx % items.length];

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs backdrop-blur-sm",
        variant === "dark"
          ? "border border-white/15 bg-white/8 text-white/80"
          : "border-border/70 bg-muted/50 text-muted-foreground border",
        className,
      )}
      aria-hidden
    >
      <LiveDot tone={item.tone} />
      <span
        key={idx}
        className="animate-in fade-in slide-in-from-bottom-1 truncate font-medium duration-300"
      >
        {item.text}
      </span>
      <span
        className={cn(
          "tabular-nums",
          variant === "dark" ? "text-white/35" : "text-muted-foreground/70",
        )}
      >
        {reduced ? "now" : `${secs % 60}s`}
      </span>
    </div>
  );
}

export function PortalLiveTicker({ locale = "en" }: { locale?: string }) {
  return (
    <LiveOpsTicker
      variant="light"
      items={locale === "es" ? PORTAL_FEED_ES : PORTAL_FEED_EN}
      className="w-full justify-start sm:w-auto"
    />
  );
}

/** Segmented status bar that fills in on mount. */
export function AnimatedStatusBar({
  segments,
}: {
  segments: { key: string; width: number; className: string; title?: string }[];
}) {
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setReady(true), 80);
    return () => window.clearTimeout(t);
  }, [reduced]);

  return (
    <div className="bg-muted flex h-1.5 overflow-hidden rounded-full">
      {segments.map((s, i) => (
        <div
          key={s.key}
          className={cn("transition-all duration-700 ease-out", s.className)}
          style={{
            width: ready ? `${s.width}%` : "0%",
            transitionDelay: reduced ? "0ms" : `${i * 80}ms`,
          }}
          title={s.title}
        />
      ))}
    </div>
  );
}

/** Soft mint accent bar on cards. */
export function CardLiveAccent({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r",
        className,
      )}
      aria-hidden
    />
  );
}

/** Live count with subtle pulse when value is > 0. */
export function LiveCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1.5 text-xs tabular-nums",
        className,
      )}
    >
      {value > 0 ? <LiveDot /> : <LiveDot ping={false} tone="ok" />}
      {value}
    </span>
  );
}
