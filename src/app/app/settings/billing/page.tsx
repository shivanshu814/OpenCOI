import { CheckoutButton } from "@/components/checkout-button";
import { getSessionOrg } from "@/lib/auth/session";
import { PLANS } from "@/lib/billing/plans";
import { isPaddleCheckoutConfigured, isSupabaseConfigured } from "@/lib/config";
import Link from "next/link";

export default async function BillingSettingsPage() {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;
  const paddleReady = isPaddleCheckoutConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Paddle is merchant of record (US sales tax handled). Plans from
          docs/01 §8.
        </p>
      </div>

      <section className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Current subscription</h2>
        </div>
        <dl className="grid gap-x-8 gap-y-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
          <div>
            <dt className="text-muted-foreground text-xs font-medium">
              Current plan
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {session?.plan ?? "None (founding / manual invoice OK)"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium">
              Status
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {session?.subscriptionStatus ?? "—"}
            </dd>
          </div>
        </dl>
        {!paddleReady ? (
          <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed sm:px-5">
            Paddle client token / price IDs not set. Add{" "}
            <code>NEXT_PUBLIC_PADDLE_*</code> + webhook secret after Paddle KYC.
            Until then, onboard customers and invoice manually (launch plan
            fallback).
          </p>
        ) : null}
      </section>

      <section className="bg-card rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Plans</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Change plans anytime — billing is prorated by Paddle.
          </p>
        </div>
        <div className="divide-y">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {plan.name}
                  <span className="text-muted-foreground ml-2 font-normal tabular-nums">
                    ${plan.priceMonthly}/mo
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {plan.features.slice(0, 3).join(" · ")}
                </p>
              </div>
              <CheckoutButton
                planId={plan.id}
                label={
                  session?.plan === plan.id
                    ? "Current plan"
                    : `Upgrade to ${plan.name}`
                }
                variant={session?.plan === plan.id ? "secondary" : "default"}
                size="default"
              />
            </div>
          ))}
        </div>
      </section>

      <p className="text-muted-foreground text-xs">
        Full plan comparison on the{" "}
        <Link href="/pricing" className="underline-offset-2 hover:underline">
          pricing page
        </Link>
        .
      </p>
    </div>
  );
}
