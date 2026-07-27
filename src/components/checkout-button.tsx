"use client";

import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/billing/plans";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { cn } from "@/lib/utils";
import {
  notifyApiError,
  notifyCaughtError,
  notifyWarning,
} from "@/lib/ui/toast";
import { ArrowRight, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  planId: PlanId;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function CheckoutButton({
  planId,
  label = "Start now",
  variant = "default",
  className,
  size = "lg",
}: Props) {
  const router = useRouter();
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [busy, setBusy] = useState(false);

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const env =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
      ? "production"
      : "sandbox";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void initializePaddle({
      token,
      environment: env,
    }).then((instance) => {
      if (!cancelled) setPaddle(instance);
    });
    return () => {
      cancelled = true;
    };
  }, [token, env]);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(`/pricing?plan=${planId}`)}`,
        );
        return;
      }

      const data = (await res.json()) as {
        ok?: boolean;
        demo?: boolean;
        priceId?: string;
        customData?: Record<string, string>;
        customerEmail?: string | null;
        successUrl?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        notifyApiError(data, "Checkout failed");
        return;
      }

      if (data.demo || !token) {
        notifyWarning(
          data.message ??
            "Paddle is not live yet — continue onboarding; founder can invoice until KYC clears.",
        );
        router.push("/app/onboarding");
        return;
      }

      if (!paddle || !data.priceId) {
        notifyWarning("Paddle is still loading — try again in a second.");
        return;
      }

      paddle.Checkout.open({
        items: [{ priceId: data.priceId, quantity: 1 }],
        customData: data.customData,
        customer: data.customerEmail
          ? { email: data.customerEmail }
          : undefined,
        settings: data.successUrl ? { successUrl: data.successUrl } : undefined,
      });
    } catch (err) {
      notifyCaughtError(err, "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className, className?.includes("w-full") && "w-full")}
      pending={busy}
      pendingIcon={CreditCard}
      disabled={busy}
      onClick={onClick}
    >
      {busy ? (
        // The arc comes from Button's `pending` — one spinner, not two.
        "Opening…"
      ) : (
        <>
          {label}
          <ArrowRight
            data-icon="inline-end"
            className="size-4"
            strokeWidth={2.25}
          />
        </>
      )}
    </Button>
  );
}
