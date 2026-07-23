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
          Paddle is merchant of record (US sales tax handled). Plans from docs/01
          §8.
        </p>
      </div>

      <section className="rounded-lg border p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Current plan: </span>
          <span className="font-medium">
            {session?.plan ?? "None (founding / manual invoice OK)"}
          </span>
        </p>
        <p className="mt-1">
          <span className="text-muted-foreground">Status: </span>
          <span className="font-medium">
            {session?.subscriptionStatus ?? "—"}
          </span>
        </p>
        {!paddleReady ? (
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            Paddle client token / price IDs not set. Add{" "}
            <code>NEXT_PUBLIC_PADDLE_*</code> + webhook secret after Paddle KYC.
            Until then, onboard customers and invoice manually (launch plan
            fallback).
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className="rounded-lg border p-4">
            <h2 className="font-medium">
              {plan.name} · ${plan.priceMonthly}/mo
            </h2>
            <ul className="text-muted-foreground mt-3 space-y-1 text-xs">
              {plan.features.slice(0, 3).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="mt-4">
              <CheckoutButton
                planId={plan.id}
                label={
                  session?.plan === plan.id ? "Current plan" : `Upgrade to ${plan.name}`
                }
                variant={session?.plan === plan.id ? "secondary" : "default"}
                size="default"
              />
            </div>
          </div>
        ))}
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
