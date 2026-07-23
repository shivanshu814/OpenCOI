"use client";

import { LiveDot } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/billing/plans";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { ArrowRight, LoaderCircle } from "lucide-react";
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
  const [note, setNote] = useState<string | null>(null);

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
    setNote(null);
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
        setNote(data.error ?? "Checkout failed");
        return;
      }

      if (data.demo || !token) {
        setNote(
          data.message ??
            "Paddle not configured yet. Sign in and use the onboarding wizard — founder can invoice manually until Paddle KYC clears.",
        );
        router.push("/app/onboarding");
        return;
      }

      if (!paddle || !data.priceId) {
        setNote("Paddle.js still loading — try again in a second.");
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
      setNote(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={busy}
        onClick={onClick}
      >
        {busy ? (
          <>
            <LoaderCircle
              data-icon="inline-start"
              className="size-4 animate-spin"
            />
            Opening…
          </>
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
      {note ? (
        <p className="text-muted-foreground flex items-start gap-1.5 text-xs leading-relaxed">
          <LiveDot tone="warn" className="mt-1" />
          <span>{note}</span>
        </p>
      ) : null}
    </div>
  );
}
