import { DISCLAIMER } from "@/lib/extraction/schema";
import { cn } from "@/lib/utils";
import Link from "next/link";

const DISCLAIMER_ES =
  "Asistencia para revisión de documentos — no es asesoría legal, de seguros ni profesional.";

export function DisclaimerFooter({
  className,
  locale = "en",
  showBothLocales = false,
}: {
  className?: string;
  locale?: "en" | "es";
  /** Vendor portal: always show EN + ES (layout has no token locale). */
  showBothLocales?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground border-t px-4 py-3 text-center text-xs leading-relaxed",
        className,
      )}
    >
      {showBothLocales ? (
        <>
          <p>{DISCLAIMER}</p>
          <p className="mt-1">{DISCLAIMER_ES}</p>
        </>
      ) : (
        <p>{locale === "es" ? DISCLAIMER_ES : DISCLAIMER}</p>
      )}
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
