import { BrandMark } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-background mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <BrandMark />
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
          404
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
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
