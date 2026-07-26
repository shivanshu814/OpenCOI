import { LiveBadge, LiveDot } from "@/components/live-activity";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  FileBarChart2,
  Mail,
  Users,
} from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    n: "1",
    title: "Add a property",
    body: "Set the building, certificate holder, and owner email.",
    href: "/app/properties",
    icon: Building2,
  },
  {
    n: "2",
    title: "Assign vendors",
    body: "Link the trades working that property so coverage rolls up.",
    href: "/app/vendors",
    icon: Users,
  },
  {
    n: "3",
    title: "Generate the report",
    body: "Download a branded PDF or email it to the owner on file.",
    href: null,
    icon: Mail,
  },
] as const;

/**
 * Premium empty state for `/app/reports` — honest (no fake properties),
 * clear next steps, mint/ink brand.
 */
export function ReportsEmptyState() {
  return (
    <section className="relative overflow-hidden rounded-xl border bg-card">
      <div
        className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 8% -10%, color-mix(in oklch, var(--brand) 16%, transparent), transparent 55%),
            radial-gradient(ellipse 50% 40% at 95% 100%, color-mix(in oklch, var(--ink) 6%, transparent), transparent 50%)
          `,
        }}
      />

      <div className="relative grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-brand-muted text-brand flex size-11 items-center justify-center rounded-xl ring-1 ring-brand/15">
              <FileBarChart2 className="size-5" strokeWidth={2.25} aria-hidden />
            </span>
            <LiveBadge label="Ready when you are" tone="info" />
          </div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            Owner reports need a property first
          </h2>
          <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
            Monthly branded PDFs for building owners — compliance %, documents
            on file, and risks flagged. Add a property, assign vendors, then
            send or download anytime.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href="/app/properties"
              className={cn(
                buttonVariants({ size: "default" }),
                "bg-ink text-ink-foreground hover:bg-ink/90 gap-1.5 shadow-xs",
              )}
            >
              Add property
              <ArrowRight className="size-3.5" strokeWidth={2.25} aria-hidden />
            </Link>
            <Link
              href="/app/vendors"
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              Manage vendors
            </Link>
          </div>

          <p className="text-muted-foreground mt-4 inline-flex items-center gap-1.5 text-xs">
            <LiveDot tone="ok" ping={false} />
            No sample properties — your list stays empty until you add one.
          </p>
        </div>

        <ol className="min-w-0 space-y-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const inner = (
              <>
                <span className="bg-brand-muted text-brand flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-brand/10">
                  <Icon className="size-4" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                      Step {step.n}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold">
                    {step.title}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {step.body}
                  </span>
                </span>
                {step.href ? (
                  <ArrowRight
                    className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : null}
              </>
            );

            const className =
              "group flex items-start gap-3 rounded-lg border bg-background/80 px-3.5 py-3 backdrop-blur-sm transition-colors hover:border-brand/25 hover:bg-brand-muted/40";

            return (
              <li key={step.n}>
                {step.href ? (
                  <Link href={step.href} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
