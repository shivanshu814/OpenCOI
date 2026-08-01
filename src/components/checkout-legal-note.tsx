import { cn } from "@/lib/utils";
import Link from "next/link";

/** Legal acknowledgment shown next to any button that starts a Paddle checkout. */
export function CheckoutLegalNote({ className }: { className?: string }) {
  const link =
    "text-foreground font-medium underline-offset-2 hover:underline";
  return (
    <p
      className={cn(
        "text-muted-foreground text-xs leading-relaxed",
        className,
      )}
    >
      By continuing to checkout, you acknowledge that you have read and agree
      to our{" "}
      <Link href="/terms" className={link}>
        Terms of Service
      </Link>
      ,{" "}
      <Link href="/refund" className={link}>
        Cancellation &amp; Refund Policy
      </Link>
      , and{" "}
      <Link href="/privacy" className={link}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}
