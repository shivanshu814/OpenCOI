import { CheckoutButton } from "@/components/checkout-button";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionOrg } from "@/lib/auth/session";
import { PLANS } from "@/lib/billing/plans";
import { isPaddleCheckoutConfigured, isSupabaseConfigured } from "@/lib/config";
import Link from "next/link";

export default async function BillingSettingsPage() {
  const live = isSupabaseConfigured();
  const session = live ? await getSessionOrg() : null;
  const paddleReady = isPaddleCheckoutConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Paddle is merchant of record (US sales tax handled). Plans from docs/01 §8."
        live
      />

      <Card className="gap-0 overflow-hidden py-0">
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
        <CardHeader className="border-b pt-4">
          <CardTitle className="text-sm font-semibold">
            Current subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4 sm:px-5">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
        </CardContent>
        {!paddleReady ? (
          <CardFooter className="sm:px-5">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Paddle client token / price IDs not set. Add{" "}
              <code>NEXT_PUBLIC_PADDLE_*</code> + webhook secret after Paddle
              KYC. Until then, onboard customers and invoice manually (launch
              plan fallback).
            </p>
          </CardFooter>
        ) : null}
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b pt-4">
          <CardTitle className="text-sm font-semibold">Plans</CardTitle>
          <CardDescription className="text-xs">
            Change plans anytime — billing is prorated by Paddle.
          </CardDescription>
        </CardHeader>
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
      </Card>

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
