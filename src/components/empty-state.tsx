import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="bg-card/50 rounded-xl border border-dashed px-6 py-14 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-5")}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
