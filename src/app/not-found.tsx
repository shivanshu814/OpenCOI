import { BrandMark } from "@/components/certshield-logo";
import { LiveBadge } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-background mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandMark />
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            404
          </p>
          <LiveBadge label="Offline path" tone="warn" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          That URL doesn’t exist. Head back to the dashboard or marketing site.
        </p>
      </div>
      <div className="flex gap-3">
        <Button render={<Link href="/app" />}>Dashboard</Button>
        <Button variant="outline" render={<Link href="/" />}>
          Home
        </Button>
      </div>
    </div>
  );
}
