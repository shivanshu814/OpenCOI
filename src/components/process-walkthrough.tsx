"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { PointerGlow } from "@/components/pointer-glow";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Link2,
  Mail,
  MessageCircle,
  MousePointer2,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Scene =
  "dashboard" | "drilldown" | "gap" | "email" | "chat" | "portal" | "status";

const STEPS: {
  title: string;
  body: string;
  meta: string;
  scene: Scene;
}[] = [
  {
    title: "Your dashboard",
    body: "Green, amber, red across every vendor — who's covered, who's expiring, who needs attention today. One screen, no spreadsheet.",
    meta: "Instant visibility",
    scene: "dashboard",
  },
  {
    title: "Drill into the problems",
    body: "One click filters to the vendors that need action — each with the reason spelled out, not just a red dot.",
    meta: "No digging",
    scene: "drilldown",
  },
  {
    title: "See the exact gap",
    body: "Not just “non-compliant” — the specific field: the limit that's too low, or the endorsement form that isn't attached behind the certificate.",
    meta: "Field-level detail",
    scene: "gap",
  },
  {
    title: "Send the gap email",
    body: "One click emails the vendor — their insurance agent cc'd, since the agent usually fixes it — in English or Spanish, with a link that opens exactly what's missing.",
    meta: "EN + ES",
    scene: "email",
  },
  {
    title: "Vendors get instant answers",
    body: "The vendor portal explains the gap in plain language and answers their questions — so the confused phone call comes to us, not to you.",
    meta: "Support chat built in",
    scene: "chat",
  },
  {
    title: "They upload through a link",
    body: "A no-login magic link. The vendor — or their agent — uploads the corrected certificate from a phone in about a minute.",
    meta: "No vendor passwords",
    scene: "portal",
  },
  {
    title: "Status flips green",
    body: "The new certificate is re-checked in full, a human signs off, and the dashboard updates — with every step stamped in the audit trail.",
    meta: "Human-verified",
    scene: "status",
  },
];

/**
 * Autoplay is driven BY the demo cursor: each scene plays, the reader gets a
 * beat to take it in, the cursor glides in and clicks — and the click is what
 * advances to the next step (~0.75s later, enough for the ripple to land).
 *
 * One map so the cursor animation and the step-advance timer can never drift:
 * click happens at delay + CLICK_OFFSET_MS; the step advances POST_CLICK_MS
 * after the click. `null` = no cursor in that scene (chat), fixed dwell.
 */
const CURSOR_DELAY_MS: Record<Scene, number | null> = {
  dashboard: 3400,
  drilldown: 3600,
  gap: 3800,
  email: 3900,
  chat: null,
  portal: 3600,
  status: 3400,
};
/** Glide duration before the pointer "clicks" (matches cs-cursor-glide + dip delay). */
const CLICK_OFFSET_MS = 1200;
/** Breath between the click and the step change — the ripple needs to land. */
const POST_CLICK_MS = 750;
/** Chat has no cursor; it dwells long enough to read the Spanish reply. */
const CHAT_DWELL_MS = 6800;

function advanceMsFor(scene: Scene): number {
  const delay = CURSOR_DELAY_MS[scene];
  return delay === null
    ? CHAT_DWELL_MS
    : delay + CLICK_OFFSET_MS + POST_CLICK_MS;
}

/* ── Scene building blocks ─────────────────────────────────────────────── */

function SceneRow({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Pill({
  tone,
  children,
  delay = 0,
}: {
  tone: "ok" | "warn" | "bad" | "neutral" | "brand";
  children: React.ReactNode;
  delay?: number;
}) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    warn: "bg-amber-50 text-amber-700 ring-amber-600/15",
    bad: "bg-red-50 text-red-700 ring-red-600/15",
    neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
    brand: "bg-brand-muted text-brand ring-brand/20",
  } as const;
  return (
    <span
      className={cn(
        "animate-in fade-in zoom-in-95 fill-mode-both inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ring-inset duration-400",
        tones[tone],
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

/**
 * The demo cursor: glides in from an offset, then "clicks" its target (dip +
 * ripple). Each scene positions one over the element the step is about, which
 * turns a slideshow into something that reads as the product being *used*.
 * Pure theatre — hidden from AT and removed entirely under reduced motion.
 */
function DemoCursor({
  className,
  delay = 900,
  fromX = 110,
  fromY = 120,
}: {
  /** Absolute-position utilities for the cursor's final resting point. */
  className?: string;
  delay?: number;
  fromX?: number;
  fromY?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "cs-demo-cursor pointer-events-none absolute z-10",
        className,
      )}
    >
      <span
        className="cs-cursor-glide block"
        style={
          {
            "--cs-cur-x": `${fromX}px`,
            "--cs-cur-y": `${fromY}px`,
            animationDelay: `${delay}ms`,
          } as React.CSSProperties
        }
      >
        <span
          className="cs-cursor-tap absolute -top-1.5 -left-1.5 size-6 rounded-full bg-slate-500/30 opacity-0"
          style={{ animationDelay: `${delay + 1250}ms` }}
        />
        <span
          className="cs-cursor-dip block"
          style={{ animationDelay: `${delay + 1200}ms` }}
        >
          <MousePointer2
            className="size-4 fill-white text-slate-700 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
            strokeWidth={1.5}
          />
        </span>
      </span>
    </span>
  );
}

function VendorRow({
  name,
  note,
  tone,
  status,
  delay,
}: {
  name: string;
  note: string;
  tone: "ok" | "warn" | "bad";
  status: string;
  delay: number;
}) {
  const dot = {
    ok: "bg-emerald-500",
    warn: "bg-amber-400",
    bad: "bg-red-500",
  }[tone];
  return (
    <SceneRow delay={delay}>
      <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-xs">
        <span className={cn("size-2 shrink-0 rounded-full", dot)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-700">
            {name}
          </p>
          <p className="truncate text-[11px] text-slate-400">{note}</p>
        </div>
        <Pill tone={tone} delay={delay + 200}>
          {status}
        </Pill>
      </div>
    </SceneRow>
  );
}

/* ── The seven scenes ──────────────────────────────────────────────────── */

/** STEP 1 — portfolio at a glance: traffic-light bar + mixed statuses. */
function DashboardScene() {
  return (
    <div className="relative space-y-3">
      <DemoCursor
        className="right-12 bottom-6"
        delay={CURSOR_DELAY_MS.dashboard!}
        fromX={-120}
        fromY={-90}
      />
      <SceneRow delay={0}>
        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Vendors properly insured
            </p>
            <p className="text-lg leading-none font-semibold text-slate-800 tabular-nums">
              72<span className="text-xs text-slate-300">%</span>
            </p>
          </div>
          <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-slate-100">
            {[
              ["bg-emerald-500", "58%"],
              ["bg-amber-400", "18%"],
              ["bg-red-500", "14%"],
              ["bg-slate-300", "10%"],
            ].map(([cls, w], i) => (
              <span
                key={cls}
                className={cn(cls, "cs-grow-x h-full")}
                style={{ width: w, animationDelay: `${250 + i * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </SceneRow>
      <VendorRow
        name="Summit Roofing LLC"
        note="Insurance valid"
        tone="ok"
        status="Covered"
        delay={550}
      />
      <VendorRow
        name="Northside HVAC"
        note="Expires in 21 days"
        tone="warn"
        status="Expiring"
        delay={750}
      />
      <VendorRow
        name="Apex Plumbing Co."
        note="Limit below requirement"
        tone="bad"
        status="Needs fixing"
        delay={950}
      />
    </div>
  );
}

/** STEP 2 — the filtered problems list, reasons spelled out. */
function DrilldownScene() {
  return (
    <div className="relative space-y-3">
      <DemoCursor
        className="top-3 left-14"
        delay={CURSOR_DELAY_MS.drilldown!}
        fromX={140}
        fromY={110}
      />
      <SceneRow delay={0}>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white">
            Needs attention · 2
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400">
            All vendors · 25
          </span>
        </div>
      </SceneRow>
      <VendorRow
        name="Apex Plumbing Co."
        note="GL limit $500K — your requirement is $1M"
        tone="bad"
        status="Under limit"
        delay={350}
      />
      <VendorRow
        name="Greenway Landscape"
        note="CG 20 37 not attached to the certificate"
        tone="bad"
        status="Form missing"
        delay={600}
      />
      <SceneRow delay={1100} className="text-center">
        <p className="text-[11px] font-medium text-slate-400">
          The reason is on the row — no opening PDFs to find out why
        </p>
      </SceneRow>
    </div>
  );
}

/** STEP 3 — field-level gap detail with confidence. */
const GAP_ROWS = [
  { field: "GL each occurrence", value: "$500,000", conf: 98, ok: false },
  { field: "Your requirement", value: "$1,000,000", conf: null, ok: true },
  { field: "Expiration date", value: "04/12/2027", conf: 99, ok: true },
  {
    field: "CG 20 37 (completed ops)",
    value: "Not found",
    conf: 91,
    ok: false,
  },
] as const;

function GapScene() {
  return (
    <div className="relative space-y-2">
      <DemoCursor
        className="right-24 bottom-16"
        delay={CURSOR_DELAY_MS.gap!}
        fromX={90}
        fromY={-120}
      />
      {GAP_ROWS.map((row, i) => (
        <SceneRow key={row.field} delay={i * 240}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 shadow-xs",
              row.ok ? "border-slate-100" : "border-red-200/70 bg-red-50/40",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">
              {row.field}
            </span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                row.ok ? "text-slate-800" : "text-red-600",
              )}
            >
              {row.value}
            </span>
            {row.conf !== null ? (
              <span className="w-9 text-right text-[10px] font-semibold text-slate-400 tabular-nums">
                {row.conf}%
              </span>
            ) : (
              <span className="w-9 text-right text-[10px] font-medium text-slate-300">
                rule
              </span>
            )}
          </div>
        </SceneRow>
      ))}
      <SceneRow delay={1150} className="pt-1 text-center">
        <Pill tone="bad">2 gaps found — flagged for the chase email</Pill>
      </SceneRow>
    </div>
  );
}

/** STEP 4 — the gap email, EN + ES, to vendor and agent. */
function EmailScene() {
  return (
    <div className="relative space-y-3">
      <DemoCursor
        className="bottom-4 left-1/2"
        delay={CURSOR_DELAY_MS.email!}
        fromX={130}
        fromY={-80}
      />
      <SceneRow delay={0}>
        <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              To: Apex Plumbing · cc: their insurance agent
            </p>
            <span className="flex gap-1">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                EN
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                ES
              </span>
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <SceneRow delay={400}>
              <p className="text-[11px] leading-relaxed text-slate-500">
                A current certificate is needed before work can continue. Reply
                with a PDF, or forward this to your insurance agent.
              </p>
            </SceneRow>
            {/* The specific gaps live behind this link — the portal's
                "What's missing" page (see the next two steps). */}
            <SceneRow delay={850}>
              <span className="border-brand/25 bg-brand-muted/60 text-brand inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold">
                <Link2 className="size-3" strokeWidth={2.5} />
                View what&rsquo;s missing — no login needed
              </span>
            </SceneRow>
          </div>
        </div>
      </SceneRow>
      <SceneRow delay={1550} className="flex justify-center">
        <Pill tone="ok">
          <Mail className="size-3" strokeWidth={2.5} />
          Sent — and it repeats until the new certificate arrives
        </Pill>
      </SceneRow>
    </div>
  );
}

/** STEP 5 — the portal support chat, in the vendor's language. */
function ChatScene() {
  return (
    <div className="space-y-2.5">
      <SceneRow delay={0} className="flex justify-end">
        <p className="max-w-[75%] rounded-2xl rounded-br-sm bg-slate-800 px-3 py-2 text-[11px] leading-relaxed text-white">
          ¿Qué es el formulario CG 20 37? Mi seguro ya está pagado.
        </p>
      </SceneRow>
      {/* Typing dots sit under the reply bubble, which slides in over them —
          no state needed to "remove" the indicator. */}
      <div className="relative">
        <SceneRow delay={500} className="absolute top-0 left-8">
          <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-3 py-3 shadow-xs">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="cs-typing size-1.5 rounded-full bg-slate-400"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </span>
        </SceneRow>
        <SceneRow delay={1500} className="flex items-end gap-2">
          <span className="bg-brand-muted text-brand flex size-6 shrink-0 items-center justify-center rounded-full">
            <MessageCircle className="size-3" strokeWidth={2} />
          </span>
          <p className="max-w-[80%] rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-600 shadow-xs">
            Es un endoso que su agente de seguros puede emitir sin costo en la
            mayoría de los casos. Reenvíe este enlace a su agente — normalmente
            toma unos minutos.
          </p>
        </SceneRow>
      </div>
      <SceneRow delay={2100} className="pt-1 text-center">
        <p className="text-[11px] font-medium text-slate-400">
          Plain-language answers, English or Spanish — your phone stays quiet
        </p>
      </SceneRow>
    </div>
  );
}

/** STEP 6 — the no-login magic-link portal upload. */
function PortalScene() {
  return (
    <div className="relative space-y-3">
      <DemoCursor
        className="top-20 right-16"
        delay={CURSOR_DELAY_MS.portal!}
        fromX={-110}
        fromY={100}
      />
      <SceneRow delay={0}>
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <Link2 className="text-brand size-4 shrink-0" strokeWidth={2} />
          <span className="truncate text-[11px] font-medium text-slate-500">
            getcertshield.vercel.app/portal/… · no login needed
          </span>
        </div>
      </SceneRow>
      <SceneRow delay={400}>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
          <span className="bg-brand-muted text-brand flex size-9 items-center justify-center rounded-lg">
            <FileText className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-700">
              ACORD-25_updated.pdf
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="cs-grow-x bg-brand h-full w-full"
                style={{ animationDelay: "700ms", animationDuration: "1.1s" }}
              />
            </div>
          </div>
          <Pill tone="ok" delay={1850}>
            <Check className="size-3" strokeWidth={3} />
            Received
          </Pill>
        </div>
      </SceneRow>
      <SceneRow delay={2050} className="text-center">
        <p className="text-[11px] font-medium text-slate-400">
          Works from a phone — the agent can upload it too
        </p>
      </SceneRow>
    </div>
  );
}

/** STEP 7 — re-checked, human sign-off, status flips, trail logged. */
function StatusScene() {
  return (
    <div className="relative space-y-3">
      <DemoCursor
        className="top-7 right-12"
        delay={CURSOR_DELAY_MS.status!}
        fromX={-130}
        fromY={90}
      />
      <SceneRow delay={0}>
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-xs">
          <span className="size-2 shrink-0 rounded-full bg-red-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-700">
              Apex Plumbing Co.
            </p>
            <p className="truncate text-[11px] text-slate-400">
              New COI re-checked · all 6 checks passed
            </p>
          </div>
          <span className="text-slate-300">
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </span>
          <Pill tone="ok" delay={600}>
            <Check className="size-3" strokeWidth={3} />
            Covered
          </Pill>
        </div>
      </SceneRow>
      <SceneRow delay={1000}>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-xs">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="bg-brand-muted text-brand flex size-8 shrink-0 items-center justify-center rounded-lg">
              <ShieldCheck className="size-4" strokeWidth={1.75} />
            </span>
            <p className="truncate text-xs font-medium text-slate-600">
              Verified by a person before publishing
            </p>
          </div>
          <span className="text-[10px] font-medium text-slate-300">logged</span>
        </div>
      </SceneRow>
      <SceneRow delay={1500} className="text-center">
        <Pill tone="brand">
          <FileText className="size-3" strokeWidth={2.5} />
          Every step in the audit trail — report-ready
        </Pill>
      </SceneRow>
    </div>
  );
}

const SCENES: Record<Scene, () => React.ReactElement> = {
  dashboard: DashboardScene,
  drilldown: DrilldownScene,
  gap: GapScene,
  email: EmailScene,
  chat: ChatScene,
  portal: PortalScene,
  status: StatusScene,
};

/* ── The walkthrough shell ─────────────────────────────────────────────── */

export function ProcessWalkthrough() {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  /** 1 = forward, -1 = back. Scenes slide in from the side you're moving toward. */
  const [dir, setDir] = useState(1);
  const [autoplay, setAutoplay] = useState(true);
  const [paused, setPaused] = useState(false);
  /** Autoplay waits until the panel has actually been seen. */
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const go = useCallback(
    (next: number, manual: boolean) => {
      setDir(
        next >= step || (step === STEPS.length - 1 && next === 0) ? 1 : -1,
      );
      setStep((next + STEPS.length) % STEPS.length);
      // Manual navigation means the user took the wheel — stop driving for them.
      if (manual) setAutoplay(false);
    },
    [step],
  );

  // Start the show only once the walkthrough is on screen — otherwise it plays
  // to nobody and a reader scrolling down arrives mid-cycle at step 4.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !autoplay || paused || !inView) return;
    timer.current = window.setTimeout(() => {
      setDir(1);
      setStep((s) => (s + 1) % STEPS.length);
    }, advanceMsFor(STEPS[step].scene));
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [step, reduced, autoplay, paused, inView]);

  const current = STEPS[step];
  const Scene = SCENES[current.scene];
  const running = autoplay && !paused && !reduced && inView;

  // Pause is mouse-only: on touch, pointerenter fires on tap and never
  // "leaves", which would freeze autoplay permanently on phones.
  const pause = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setPaused(true);
  };
  const resume = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setPaused(false);
  };

  return (
    <div
      ref={rootRef}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Crawlers and screen readers get the whole sequence regardless of
          which step is currently showing. */}
      <ol className="sr-only">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            Step {i + 1}: {s.title}. {s.body}
          </li>
        ))}
      </ol>

      {/* The framed panel. Hover-pause lives HERE, not on the whole component:
          the step text and arrows below are exactly where a reader's cursor
          rests, and parking there must not silently stop the show. */}
      <div
        onPointerEnter={pause}
        onPointerLeave={resume}
        className="relative overflow-hidden rounded-3xl bg-[oklch(0.28_0.056_248)] p-4 shadow-[0_28px_70px_-28px_rgba(8,20,38,0.5)] ring-1 ring-white/10 sm:p-8 md:p-10"
      >
        <PointerGlow />
        {/* Backdrop atmosphere — same language as the dark sections. */}
        <div
          aria-hidden
          className="cs-drift pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 20% 10%, oklch(0.68 0.14 163 / 0.3), transparent), radial-gradient(ellipse 50% 45% at 85% 85%, oklch(0.45 0.08 250 / 0.4), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Browser-chrome card. Fixed min-height so step changes never reflow
            the page below. Scenes are decorative theatre. */}
        <div
          aria-hidden
          className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(8,20,38,0.55)] ring-1 ring-white/20"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
            </span>
            <span className="mx-auto rounded-md bg-white px-6 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-100">
              {current.scene === "portal" || current.scene === "chat"
                ? "getcertshield.vercel.app/portal"
                : "getcertshield.vercel.app/app"}
            </span>
            <span className="w-10" />
          </div>
          <div className="relative flex min-h-[18rem] flex-col justify-center p-4 sm:min-h-[17rem] sm:p-6">
            {/* One-shot scan as each scene loads — the system "reading" it. */}
            <div
              key={`scan-${step}`}
              aria-hidden
              className="cs-scan-sweep from-brand/10 pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent"
              style={{ animationIterationCount: 1, animationDuration: "1.4s" }}
            />
            {/* Keyed on step: the scene re-mounts and replays its entrance,
                sliding from the direction of travel. */}
            <div
              key={step}
              className={cn(
                "animate-in fade-in fill-mode-both duration-500",
                dir === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6",
              )}
            >
              <Scene />
            </div>
          </div>
        </div>

        {/* Step segments — clickable, with a fill that doubles as the autoplay
            countdown for the active step. */}
        <div className="relative mx-auto mt-6 flex max-w-xl gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => go(i, true)}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              aria-current={i === step ? "step" : undefined}
              className="group/seg flex h-6 flex-1 items-center"
            >
              <span className="h-1 w-full overflow-hidden rounded-full bg-white/15 transition-colors group-hover/seg:bg-white/25">
                {i < step ? (
                  <span className="bg-brand/80 block h-full w-full" />
                ) : i === step ? (
                  // While autoplay drives, the fill is the countdown. A hover
                  // pause resets the timer (the effect restarts a full cycle on
                  // resume), so the bar is keyed on `paused` too — it resets
                  // with the timer instead of racing ahead of it. Once autoplay
                  // is off it's just a static filled marker.
                  <span
                    key={`${step}-${paused}`}
                    className={cn(
                      "bg-brand block h-full w-full",
                      autoplay && !reduced && inView ? "cs-grow-x" : "",
                    )}
                    style={
                      autoplay && !reduced && inView
                        ? {
                            animationDuration: `${advanceMsFor(current.scene)}ms`,
                            animationTimingFunction: "linear",
                            animationPlayState: running ? "running" : "paused",
                          }
                        : undefined
                    }
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP n / title / body + arrows — the real, always-in-DOM content. */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div aria-live="polite" className="max-w-2xl">
          <p className="text-brand text-xs font-semibold tracking-[0.18em] uppercase">
            Step {step + 1} of {STEPS.length}
          </p>
          {/* Keyed so the text glides in on every step change. */}
          <div key={step}>
            <h3 className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both mt-2 text-xl font-semibold tracking-tight duration-400 md:text-2xl">
              {current.title}
            </h3>
            <p
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-muted-foreground mt-2 text-sm leading-relaxed duration-400 md:text-base"
              style={{ animationDelay: "80ms" }}
            >
              {current.body}
            </p>
            <span
              className="animate-in fade-in fill-mode-both mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80 ring-inset duration-400"
              style={{ animationDelay: "160ms" }}
            >
              <span className="bg-brand size-1.5 rounded-full" />
              {current.meta}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => go(step - 1, true)}
            aria-label="Previous step"
            className="text-foreground hover:border-brand/50 hover:text-brand flex size-11 items-center justify-center rounded-full border border-border bg-card transition-[border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(0,184,132,0.5)] active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => go(step + 1, true)}
            aria-label="Next step"
            className={cn(
              "text-foreground hover:border-brand/50 hover:text-brand flex size-11 items-center justify-center rounded-full border border-border bg-card transition-[border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(0,184,132,0.5)] active:translate-y-0 active:scale-95",
              // Soft pulse while autoplay drives: "this is where it's going".
              running && "cs-glow-pulse",
            )}
          >
            <ArrowRight className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
