import { CheckoutButton } from "@/components/checkout-button";
import {
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionOrg } from "@/lib/auth/session";
import { PLANS, planById, type PlanId } from "@/lib/billing/plans";
import { isPaddleCheckoutConfigured, isSupabaseConfigured } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";

function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "starter" || value === "pro" || value === "business";
}

/** One emphasized upgrade CTA — Pro for most PMs; next tier if already subscribed. */
function primaryUpgradeId(current: PlanId | null): PlanId | null {
  if (current === "starter") return "pro";
  if (current === "pro") return "business";
  if (current === "business") return null;
  return "pro";
}

function statusTone(
  status: string | null | undefined,
): "default" | "secondary" | "outline" {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "trialing") return "default";
  if (s === "past_due" || s === "paused") return "secondary";
  return "outline";
}

export default async function BillingSettingsPage() {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;
  const paddleReady = isPaddleCheckoutConfigured();

  const currentId = isPlanId(session?.plan) ? session.plan : null;
  const currentPlan = planById(currentId);
  const upgradeId = primaryUpgradeId(currentId);
  const subStatus = session?.subscriptionStatus?.trim() || null;

  return (
    <PageFrame width="wide" className="space-y-8">
      <PageHeader
        title="Billing"
        description="Choose or change your CertShield plan. Paddle is merchant of record (US sales tax handled). After checkout, your workspace limits update automatically."
        audience="Org admins"
        nextStep={
          currentId
            ? "Compare plans below, or open the full pricing page for detail."
            : "Pick Pro if you manage multiple properties — or start on Starter."
        }
        help="Founding / manual-invoice access is fine until Paddle KYC is live. Plans are document-review tooling — not a guarantee of legal or insurance compliance."
        live
      />

      {/* Current plan status */}
      <Card className="gap-0 overflow-hidden py-0">
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
        <CardHeader className="border-b pt-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold tracking-tight">
                Current subscription
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Honest status for this workspace — no surprise upgrades.
              </CardDescription>
            </div>
            {currentPlan ? (
              <Badge
                variant={statusTone(subStatus)}
                className={cn(
                  subStatus &&
                    ["active", "trialing"].includes(subStatus.toLowerCase()) &&
                    "bg-brand text-brand-foreground",
                )}
              >
                {subStatus ?? "Subscribed"}
              </Badge>
            ) : (
              <Badge variant="outline">Founding / manual</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-5 sm:px-6">
          {currentPlan ? (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Plan
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {currentPlan.name}
                  <span className="text-muted-foreground ml-2 text-base font-normal tabular-nums">
                    ${currentPlan.priceMonthly}/mo
                  </span>
                </p>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {currentPlan.vendorLimit == null
                    ? "Unlimited vendors"
                    : `Up to ${currentPlan.vendorLimit} vendors`}
                  {subStatus ? ` · Paddle status: ${subStatus}` : null}
                </p>
              </div>
              <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
                Changes are prorated by Paddle. You stay the final approver on
                every compliance verdict.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xl font-semibold tracking-tight">
                None — founding / manual invoice OK
              </p>
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                This workspace is not on a Paddle subscription yet. You can keep
                using CertShield on a founding or manual-invoice arrangement, or
                upgrade below when you&apos;re ready. Most property managers land
                on <span className="text-foreground font-medium">Pro</span>{" "}
                (~100 vendors, portal, SMS chase, owner reports).
              </p>
            </div>
          )}
        </CardContent>
        {!paddleReady ? (
          <CardFooter className="bg-muted/40 border-t sm:px-6">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Paddle checkout isn&apos;t configured in this environment yet
              (missing client token / price IDs). Upgrade buttons will explain
              the fallback — founder can invoice manually until KYC clears.
            </p>
          </CardFooter>
        ) : null}
      </Card>

      {/* Plan comparison */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Plans</h2>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              One primary upgrade path highlighted. Full feature matrix on the{" "}
              <Link
                href="/pricing"
                className="text-foreground font-medium underline-offset-2 hover:underline"
              >
                pricing page
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentId === plan.id;
            const isRecommended = plan.id === "pro" && !isCurrent;
            const isPrimaryCta = upgradeId === plan.id;
            const featured = isCurrent || isRecommended || isPrimaryCta;

            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-card relative flex flex-col rounded-xl border p-5 shadow-xs",
                  featured
                    ? "border-brand/40 ring-2 ring-brand/25"
                    : "border-border/80",
                )}
              >
                {isCurrent ? (
                  <span className="bg-foreground text-background absolute -top-2.5 left-4 rounded-md px-2 py-0.5 text-[11px] font-medium">
                    Current
                  </span>
                ) : isRecommended ? (
                  <span className="bg-brand text-brand-foreground absolute -top-2.5 left-4 rounded-md px-2 py-0.5 text-[11px] font-medium">
                    Recommended
                  </span>
                ) : null}

                <div className="flex items-baseline justify-between gap-2 pt-1">
                  <h3 className="text-base font-semibold tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {plan.vendorLimit == null
                      ? "Unlimited"
                      : `${plan.vendorLimit} vendors`}
                  </p>
                </div>

                <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
                  ${plan.priceMonthly}
                  <span className="text-muted-foreground text-sm font-normal">
                    /mo
                  </span>
                </p>

                {isRecommended ? (
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Best fit for most property managers (sales default).
                  </p>
                ) : plan.id === "starter" ? (
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Lean start — up to 25 vendors, email chase, reports.
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-2 text-xs leading-snug">
                    Teams, API, white-label chase, GC project packs.
                  </p>
                )}

                <div className="mt-5 w-full">
                  <CheckoutButton
                    planId={plan.id}
                    label={
                      isCurrent
                        ? "Current plan"
                        : isPrimaryCta
                          ? `Upgrade to ${plan.name}`
                          : `Choose ${plan.name}`
                    }
                    variant={
                      isCurrent
                        ? "secondary"
                        : isPrimaryCta
                          ? "default"
                          : "outline"
                    }
                    size="default"
                    className="w-full"
                  />
                </div>

                <ul className="mt-5 flex-1 space-y-2 border-t border-border/70 pt-4 text-sm leading-relaxed">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check
                        className="text-brand mt-0.5 size-3.5 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span className="text-muted-foreground text-[13px]">
                        {f}
                      </span>
                    </li>
                  ))}
                  {plan.comingSoon?.map((f) => (
                    <li
                      key={f}
                      className="text-muted-foreground/80 flex gap-2 text-[13px]"
                    >
                      <span aria-hidden className="w-3.5 text-center">
                        —
                      </span>
                      <span>{f} (coming soon)</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <PageSecondary className="space-y-1.5 max-w-none">
        <p>
          After a successful upgrade, Paddle emails the receipt and webhooks
          update this org&apos;s plan. Need a side-by-side matrix? See{" "}
          <Link
            href="/pricing"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            /pricing
          </Link>
          .
        </p>
        <p>
          Document review assistance — not legal, insurance, or professional
          advice. Never a guarantee of compliance.
        </p>
      </PageSecondary>
    </PageFrame>
  );
}
