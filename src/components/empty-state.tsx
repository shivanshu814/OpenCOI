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
    <div className="rounded-lg border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="text-foreground mt-4 inline-block text-sm font-medium underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
