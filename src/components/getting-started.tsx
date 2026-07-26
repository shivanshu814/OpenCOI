"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Circle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "certshield.getting-started.dismissed";

const STEPS = [
  {
    n: 1,
    label: "Add vendor",
    href: "/app/vendors",
    detail: "Name, trade, and contact so chase emails have somewhere to go.",
  },
  {
    n: 2,
    label: "Upload COI",
    href: "/app/upload",
    detail: "Drop the ACORD PDF — AI extracts coverage for review.",
  },
  {
    n: 3,
    label: "Review verdict",
    href: "/app/review",
    detail: "You remain the final approver before anything is published.",
  },
  {
    n: 4,
    label: "Chase renewals",
    href: "/app/vendors",
    detail: "Automated email reminders when coverage is expiring.",
  },
  {
    n: 5,
    label: "Owner reports",
    href: "/app/reports",
    detail: "Share a compliance snapshot with building owners.",
  },
] as const;

/**
 * Lightweight, dismissible “core flow” guide for first-time dashboard users.
 * Honest about what’s live vs credential-gated.
 */
export function GettingStarted({
  className,
  hasVendors = false,
}: {
  className?: string;
  /** When true, soften the CTA — they’ve already started. */
  hasVendors?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode — still show */
    }
    setVisible(true);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      className={cn(
        "border-brand/20 from-brand-muted/80 to-background relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-5",
        className,
      )}
      aria-label="Getting started with CertShield"
    >
      <div
        className="from-brand/15 pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r to-transparent"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#0a5c44] uppercase">
            Getting started
          </p>
          <h2 className="text-ink text-sm font-semibold tracking-tight sm:text-base">
            {hasVendors
              ? "Your compliance loop — keep it moving"
              : "Five steps from first vendor to owner-ready report"}
          </h2>
          <p className="text-muted-foreground max-w-xl text-xs leading-relaxed sm:text-sm">
            CertShield reads COIs, flags gaps, and chases renewals — you approve
            every verdict. Document review assistance — not legal, insurance, or
            professional advice.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0"
          onClick={dismiss}
          aria-label="Dismiss getting started"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Link
              href={step.href}
              className="hover:border-brand/40 hover:bg-background/80 group flex h-full flex-col gap-1.5 rounded-lg border border-transparent bg-background/50 px-3 py-2.5 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                {hasVendors && step.n === 1 ? (
                  <CheckCircle2 className="text-brand size-3.5 shrink-0" />
                ) : (
                  <Circle className="text-muted-foreground/60 size-3.5 shrink-0" />
                )}
                <span className="text-muted-foreground tabular-nums">
                  {step.n}.
                </span>
                <span className="text-foreground group-hover:text-brand transition-colors">
                  {step.label}
                </span>
                <ArrowRight className="text-muted-foreground ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="text-muted-foreground text-[11px] leading-snug">
                {step.detail}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
        Live today: vendors, upload, review, chase email, properties, projects,
        reports. SMS chase needs Twilio; email-in needs Postmark; API &amp;
        webhooks are Business-tier / advanced — most teams can ignore them.
      </p>
    </aside>
  );
}
