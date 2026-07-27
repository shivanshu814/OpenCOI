import { cn } from "@/lib/utils"

/**
 * Placeholder for content that is genuinely on its way. Ink wash with a slow
 * light pass (`.cs-skeleton` in globals.css) — one soft sweep reads as "being
 * prepared"; the old full-block opacity pulse read as thirty boxes blinking.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("cs-skeleton rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
