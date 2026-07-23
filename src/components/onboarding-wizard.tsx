"use client";

import { IntakeEmailCard } from "@/components/intake-email-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TRADE_TEMPLATES } from "@/lib/requirements/templates";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const STEPS = ["company", "templates", "vendors", "intake"] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  company: "Company",
  templates: "Templates",
  vendors: "Vendors",
  intake: "Intake",
};

function OnboardingWizardInner({
  defaultOrgName,
  intakeEmail,
}: {
  defaultOrgName: string;
  intakeEmail: string;
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
        if (data.demo) {
          setNote(data.message ?? "Demo onboarding complete");
        }
        router.push(data.next ?? "/app");
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
    <div className="mx-auto max-w-xl space-y-6">
      {/* Step indicator */}
      <ol className="flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((s, i) => {
          const state =
            i < stepIdx ? "done" : i === stepIdx ? "current" : "upcoming";
          return (
            <li key={s} className="flex flex-1 flex-col gap-1.5">
              <span
                className={
                  state === "upcoming"
                    ? "bg-border h-1 rounded-full"
                    : "bg-primary h-1 rounded-full"
                }
              />
              <span
                className={
                  state === "current"
                    ? "text-foreground text-[11px] font-medium"
                    : "text-muted-foreground text-[11px]"
                }
              >
                {STEP_LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>

      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Step {stepIdx + 1} of {STEPS.length}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {step === "company" && "Your company"}
          {step === "templates" && "Requirements templates"}
          {step === "vendors" && "Add first vendors"}
          {step === "intake" && "Connect intake email"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {step === "company" &&
            "We'll use this name on chase emails and compliance reports."}
          {step === "templates" &&
            "Pick trade templates to accelerate checks. You can edit rules later."}
          {step === "vendors" &&
            "Add a few manually or paste a CSV (name, email, trade)."}
          {step === "intake" &&
            "Forward COI PDFs here — or upload from the app. Then you're done."}
        </p>
      </div>

      {step === "company" ? (
        <div className="space-y-1.5">
          <Label htmlFor="company">Company name</Label>
          <Input
            id="company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            placeholder="Acme Property Management"
          />
        </div>
      ) : null}

      {step === "templates" ? (
        <ul className="space-y-2">
          {TRADE_TEMPLATES.map((t) => {
            const on = selected.includes(t.id);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleTemplate(t.id)}
                  aria-pressed={on}
                  className={
                    on
                      ? "border-primary bg-primary/5 w-full rounded-lg border-2 px-4 py-3 text-left"
                      : "hover:bg-muted/40 w-full rounded-lg border px-4 py-3 text-left"
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    {on ? (
                      <span className="text-primary text-xs font-medium">
                        Selected
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {t.summary}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {step === "vendors" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="vname">Name</Label>
              <Input
                id="vname"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Roof Pros LLC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vemail">Email</Label>
              <Input
                id="vemail"
                type="email"
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                placeholder="ops@vendor.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vtrade">Trade</Label>
              <Input
                id="vtrade"
                value={vendorTrade}
                onChange={(e) => setVendorTrade(e.target.value)}
                placeholder="Roofer"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="csv">Or paste CSV</Label>
            <Textarea
              id="csv"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={"name,email,trade\nRoof Pros,ops@roof.com,Roofer"}
              rows={4}
            />
          </div>
        </div>
      ) : null}

      {step === "intake" ? (
        <IntakeEmailCard email={intakeEmail} demo={intakeEmail.includes("demo")} />
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {stepIdx > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          >
            Back
          </Button>
        ) : null}
        <Button type="button" disabled={busy} onClick={next}>
          {busy
            ? "Saving…"
            : step === "intake"
              ? "Finish setup"
              : "Continue"}
        </Button>
      </div>
      {note ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{note}</p>
      ) : null}
    </div>
  );
}

export function OnboardingWizard(props: {
  defaultOrgName: string;
  intakeEmail: string;
}) {
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground mx-auto max-w-xl text-sm">
          Loading…
        </p>
      }
    >
      <OnboardingWizardInner {...props} />
    </Suspense>
  );
}
