import { DISCLAIMER } from "@/lib/extraction/schema";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function DisclaimerFooter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "text-muted-foreground border-t px-4 py-3 text-center text-xs leading-relaxed",
        className,
      )}
    >
      <p>{DISCLAIMER}</p>
      <p className="mt-1 flex flex-wrap justify-center gap-3">
        <Link href="/security" className="hover:text-foreground underline">
          Security
        </Link>
        <Link href="/help" className="hover:text-foreground underline">
          Help
        </Link>
        <Link href="/terms" className="hover:text-foreground underline">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground underline">
          Privacy
        </Link>
        <Link href="/subprocessors" className="hover:text-foreground underline">
          Subprocessors
        </Link>
      </p>
    </div>
  );
}
