import { cn } from "@/lib/utils"

/**
 * Pulse placeholder — ink wash (not purple muted) so loaders read as CertShield brand.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-ink/8", className)}
      {...props}
    />
  )
}

export { Skeleton }
