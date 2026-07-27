"use client";

import { BrandMark } from "@/components/certshield-logo";
import { IntakeEmailCard } from "@/components/intake-email-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DISCLAIMER } from "@/lib/extraction/schema";
import { TRADE_TEMPLATES } from "@/lib/requirements/templates";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const STEPS = ["company", "templates", "vendors", "intake"] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<
  Step,
  { label: string; title: string; blurb: string }
> = {
  company: {
    label: "Company",
    title: "Name your workspace",
    blurb:
      "This shows on chase emails, compliance reports, and your vendor portal.",
  },
  templates: {
    label: "Templates",
    title: "Pick requirement templates",
    blurb:
      "Trade templates accelerate checks. You can edit rules anytime after setup.",
  },
  vendors: {
    label: "Vendors",
    title: "Add your first vendors",
    blurb:
      "Start with a few names, or paste a CSV. You can import the rest later.",
  },
  intake: {
    label: "Finish",
    title: "How you’ll get COIs in",
    blurb:
      "Finish setup, then upload COI PDFs from the app (or forward to your intake address when email-in is connected).",
  },
};

function OnboardingWizardInner({
  defaultOrgName,
  intakeEmail,
  inboundLive,
}: {
  defaultOrgName: string;
  intakeEmail: string | null;
  inboundLive: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const checkoutOk = search.get("checkout") === "success";

  const [stepIdx, setStepIdx] = useState(0);
  const [companyName, setCompanyName] = useState(defaultOrgName);
  const [selected, setSelected] = useState<string[]>(["global_default"]);
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorTrade, setVendorTrade] = useState("");
  const [csv, setCsv] = useState("");
  const [note, setNote] = useState<string | null>(
    checkoutOk
      ? "Payment received — finish setup so we can start reviewing COIs."
      : null,
  );
  const [busy, setBusy] = useState(false);

  const step: Step = STEPS[stepIdx] ?? "company";
  const meta =
    step === "intake" && !inboundLive
      ? {
          ...STEP_META.intake,
          title: "Upload COIs from the app",
          blurb:
            "Email-forward intake needs Postmark (not set yet). Finish setup → Upload COI is the working path today.",
        }
      : STEP_META[step];
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      demo?: boolean;
      error?: string;
      message?: string;
      next?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function next() {
    setBusy(true);
    setNote(null);
    try {
      if (step === "company") {
        await post({ step: "company", companyName });
        setStepIdx(1);
      } else if (step === "templates") {
        await post({ step: "templates", templateIds: selected });
        setStepIdx(2);
      } else if (step === "vendors") {
        const vendors =
          vendorName.trim().length > 0
            ? [
                {
                  name: vendorName.trim(),
                  email: vendorEmail.trim() || undefined,
                  trade: vendorTrade.trim() || undefined,
                },
              ]
            : [];
        await post({ step: "vendors", vendors, vendorsCsv: csv });
        setStepIdx(3);
      } else {
        const data = await post({ step: "complete", complete: true });
        // Next: Dashboard → Upload COI (green button) for each vendor PDF.
        router.push(data.next ?? "/app/upload");
        router.refresh();
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleTemplate(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="bg-background relative flex min-h-dvh flex-col overflow-hidden">
      {/* Atmosphere — mint wash + soft ink plane (brand-led, not dashboard) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 10% -10%, color-mix(in oklch, var(--brand) 18%, transparent), transparent 55%),
            radial-gradient(ellipse 60% 40% at 95% 15%, color-mix(in oklch, var(--ink) 8%, transparent), transparent 50%),
            linear-gradient(180deg, oklch(0.985 0.01 163) 0%, var(--background) 42%, var(--background) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklch,var(--brand)_45%,transparent)] to-transparent"
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <BrandMark markSize={30} />
        <p className="text-muted-foreground text-xs font-medium tracking-wide sm:text-sm">
          Setup · {stepIdx + 1}/{STEPS.length}
        </p>
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 py-4 sm:gap-10 sm:py-8">
          {/* Progress rail */}
          <div className="space-y-4">
            <div
              className="bg-border/80 h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Setup progress"
            >
              <div
                className="bg-brand h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="grid grid-cols-4 gap-2 sm:gap-3">
              {STEPS.map((s, i) => {
                const done = i < stepIdx;
                const current = i === stepIdx;
                return (
                  <li key={s} className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:size-8 sm:text-sm",
                          done && "bg-brand text-brand-foreground",
                          current &&
                            "bg-ink text-ink-foreground ring-brand/30 ring-2 ring-offset-2 ring-offset-background",
                          !done &&
                            !current &&
                            "bg-muted text-muted-foreground",
                        )}
                        aria-current={current ? "step" : undefined}
                      >
                        {done ? <Check className="size-3.5 sm:size-4" /> : i + 1}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs font-medium sm:text-sm",
                          current ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {STEP_META[s].label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Step panel — large interaction surface */}
          <section className="border-border/70 bg-card/90 shadow-none rounded-2xl border px-5 py-7 backdrop-blur-sm sm:px-10 sm:py-10">
            <div className="max-w-2xl">
              <p className="text-brand text-xs font-semibold tracking-[0.14em] uppercase">
                Step {stepIdx + 1} of {STEPS.length}
              </p>
              <h1 className="text-foreground mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {meta.title}
              </h1>
              <p className="text-muted-foreground mt-3 max-w-xl text-base leading-relaxed sm:text-lg">
                {meta.blurb}
              </p>
            </div>

            <div className="mt-8 sm:mt-10">
              {step === "company" ? (
                <div className="max-w-xl space-y-2.5">
                  <Label htmlFor="company" className="text-sm font-medium">
                    Company name
                  </Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="Acme Property Management"
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>
              ) : null}

              {step === "templates" ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {TRADE_TEMPLATES.map((t) => {
                    const on = selected.includes(t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => toggleTemplate(t.id)}
                          aria-pressed={on}
                          className={cn(
                            "w-full rounded-xl border px-4 py-4 text-left transition-colors sm:min-h-[7.5rem]",
                            on
                              ? "border-brand bg-brand-muted/60 ring-brand/25 ring-1"
                              : "border-border hover:bg-muted/50",
                          )}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span className="text-base font-medium">
                              {t.name}
                            </span>
                            {on ? (
                              <span className="text-brand flex shrink-0 items-center gap-1 text-xs font-semibold">
                                <Check className="size-3.5" />
                                Selected
                              </span>
                            ) : null}
                          </span>
                          <span className="text-muted-foreground mt-1.5 block text-sm leading-snug">
                            {t.summary}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {step === "vendors" ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="vname">Name</Label>
                      <Input
                        id="vname"
                        value={vendorName}
                        onChange={(e) => setVendorName(e.target.value)}
                        placeholder="Roof Pros LLC"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vemail">Email</Label>
                      <Input
                        id="vemail"
                        type="email"
                        value={vendorEmail}
                        onChange={(e) => setVendorEmail(e.target.value)}
                        placeholder="ops@vendor.com"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vtrade">Trade</Label>
                      <Input
                        id="vtrade"
                        value={vendorTrade}
                        onChange={(e) => setVendorTrade(e.target.value)}
                        placeholder="Roofer"
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="csv">Or paste CSV</Label>
                    <Textarea
                      id="csv"
                      value={csv}
                      onChange={(e) => setCsv(e.target.value)}
                      placeholder={
                        "name,email,trade\nRoof Pros,ops@roof.com,Roofer"
                      }
                      rows={5}
                      className="min-h-[8rem] text-sm"
                    />
                  </div>
                </div>
              ) : null}

              {step === "intake" ? (
                <div className="max-w-2xl space-y-4">
                  <IntakeEmailCard
                    email={intakeEmail}
                    inboundLive={inboundLive}
                  />
                  <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                    <li>
                      Click <strong className="text-foreground font-medium">Finish setup</strong>{" "}
                      below.
                    </li>
                    <li>
                      You’ll land on{" "}
                      <strong className="text-foreground font-medium">Upload COI</strong> — pick a
                      vendor and drop the PDF.
                    </li>
                    <li>
                      Open <strong className="text-foreground font-medium">Review queue</strong>{" "}
                      to check the AI extraction, then publish the verdict.
                    </li>
                  </ol>
                </div>
              ) : null}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t pt-6">
              {stepIdx > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={busy}
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  className="min-w-28"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              ) : null}
              <Button
                type="button"
                size="lg"
                pending={busy}
                pendingGlyph="check"
                disabled={busy || (step === "company" && !companyName.trim())}
                onClick={next}
                className="min-w-40"
              >
                {busy ? (
                  // Arc supplied by Button's `pending`.
                  "Saving…"
                ) : step === "intake" ? (
                  <>
                    Finish setup → Upload COI
                    <Check className="size-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              {step === "vendors" ? (
                <p className="text-muted-foreground text-sm">
                  You can skip and add vendors later from the app.
                </p>
              ) : null}
            </div>

            {note ? (
              <Alert className="mt-6">
                <AlertDescription>{note}</AlertDescription>
              </Alert>
            ) : null}
          </section>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-5 text-center sm:px-8">
        <p className="text-muted-foreground mx-auto max-w-2xl text-[11px] leading-relaxed sm:text-xs">
          {DISCLAIMER}
        </p>
      </footer>
    </div>
  );
}

export function OnboardingWizard(props: {
  defaultOrgName: string;
  intakeEmail: string | null;
  inboundLive: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-dvh items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading setup…</p>
        </div>
      }
    >
      <OnboardingWizardInner {...props} />
    </Suspense>
  );
}
