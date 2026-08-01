"use client";

import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/billing/plans";
import {
  notifyApiError,
  notifyCaughtError,
  notifySuccess,
  notifyWarning,
} from "@/lib/ui/toast";
import { cn } from "@/lib/utils";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  planId: PlanId;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  size?: "default" | "sm" | "lg";
  /**
   * When true, the click PATCHes the existing subscription in place with
   * prorated billing instead of opening a new Paddle overlay. Without
   * this branch, an "Upgrade to Business" click would create a second
   * subscription and double-bill the customer.
   */
  changeInPlace?: boolean;
  /** Shown in the confirm dialog for changeInPlace clicks. */
  planName?: string;
  /**
   * Paddle customer ID (`ctm_...`) once the org has completed at least one
   * checkout. Passed to Paddle.Initialize as `pwCustomer.id` so Paddle Retain
   * can attribute in-checkout events to the right customer for dunning and
   * churn analytics. Absent (null) for signed-out visitors and orgs that
   * have never transacted — Paddle simply skips Retain wiring in that case.
   *
   * MUST be the Paddle customer ID, not our internal user or org id.
   */
  paddleCustomerId?: string | null;
  /**
   * Promo code to pre-apply at checkout (e.g. from a `?promo=` landing link).
   * Invalid-looking values are dropped client-side; Paddle still validates
   * the code server-side, so an expired/unknown code simply isn't applied.
   */
  discountCode?: string | null;
};

/** Paddle discount codes are letters+numbers, up to 32 chars. */
function sanitizeDiscountCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return /^[a-zA-Z0-9]{1,32}$/.test(code) ? code : null;
}

export function CheckoutButton({
  planId,
  label = "Start now",
  variant = "default",
  className,
  size = "lg",
  changeInPlace = false,
  planName,
  paddleCustomerId,
  discountCode,
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
      // Only pass pwCustomer when we actually have a Paddle customer id.
      // Passing `{ id: undefined }` still counts as "set" to Paddle.js and
      // logs noisy warnings in the console for signed-out visitors.
      ...(paddleCustomerId
        ? { pwCustomer: { id: paddleCustomerId } }
        : {}),
    }).then((instance) => {
      if (!cancelled) setPaddle(instance);
    });
    return () => {
      cancelled = true;
    };
  }, [token, env, paddleCustomerId]);

  async function onClick() {
    // Change-in-place branch: PATCH the existing sub instead of opening a
    // new checkout. Confirmation matters here because a downgrade is a
    // destructive user action ("did I mean to give up features?"), and an
    // upgrade produces an immediate prorated charge on their card.
    if (changeInPlace) {
      const name = planName ?? planId;
      const ok = window.confirm(
        `Change your plan to ${name}? Any price difference is prorated and billed immediately.`,
      );
      if (!ok) return;
      setBusy(true);
      try {
        const res = await fetch("/api/billing/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          noop?: boolean;
          planName?: string;
          message?: string;
          error?: string;
        };
        if (!res.ok) {
          notifyApiError(data, "Plan change failed");
          return;
        }
        notifySuccess(
          data.noop
            ? (data.message ?? "You are already on this plan.")
            : `Plan changed to ${data.planName ?? name}.`,
        );
        router.refresh();
      } catch (err) {
        notifyCaughtError(err, "Plan change failed");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (res.status === 401) {
        const promo = sanitizeDiscountCode(discountCode);
        const next = `/pricing?plan=${planId}${promo ? `&promo=${promo}` : ""}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
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
        discountCode: sanitizeDiscountCode(discountCode),
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
      pendingGlyph="card"
      disabled={busy}
      onClick={onClick}
    >
      {busy ? (
        // PendingGlyph on the button — no second spinner here.
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
