import { DISCLAIMER } from "@/lib/extraction/schema";
import Link from "next/link";

export function DisclaimerFooter() {
  return (
    <div className="text-muted-foreground border-t px-4 py-3 text-center text-xs leading-relaxed">
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
      </p>
    </div>
  );
}
