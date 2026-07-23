import { DISCLAIMER } from "@/lib/extraction/schema";

export function DisclaimerFooter() {
  return (
    <p className="text-muted-foreground border-t px-4 py-3 text-center text-xs leading-relaxed">
      {DISCLAIMER}
    </p>
  );
}
