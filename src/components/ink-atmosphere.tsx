import { cn } from "@/lib/utils";

/**
 * Shared ink atmosphere used across marketing surfaces.
 *
 * Two decorative layers that move at different rates, which is what actually
 * produces the sense of depth: the glow drifts on a very slow loop while the
 * grid parallaxes against the scroll at half speed. Both are transform-only and
 * `aria-hidden`, and both stop dead under `prefers-reduced-motion`. The grid's
 * parallax is a CSS scroll-driven animation, so it costs no main-thread work and
 * simply renders static in browsers that don't support `animation-timeline`.
 */
export function InkAtmosphere({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "soft" | "top";
}) {
  const glow =
    variant === "top"
      ? "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.68 0.14 163 / 0.3), transparent)"
      : variant === "soft"
        ? "radial-gradient(ellipse 70% 55% at 80% 20%, oklch(0.68 0.14 163 / 0.22), transparent)"
        : "radial-gradient(ellipse 70% 55% at 15% 20%, oklch(0.68 0.14 163 / 0.35), transparent), radial-gradient(ellipse 55% 45% at 85% 75%, oklch(0.45 0.08 250 / 0.45), transparent)";

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-40",
          variant === "soft" ? "cs-drift-alt" : "cs-drift",
          className,
        )}
        style={{ backgroundImage: glow }}
        aria-hidden
      />
      {/* Aurora pair — two blurred blobs wandering on different periods, so the
          light on the section visibly moves without ever repeating cleanly. */}
      <div
        aria-hidden
        className="cs-aurora-a pointer-events-none absolute -top-[20%] -left-[10%] size-[55%] rounded-full opacity-25 blur-3xl"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.68 0.14 163 / 0.5), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="cs-aurora-b pointer-events-none absolute -right-[12%] -bottom-[25%] size-[60%] rounded-full opacity-20 blur-3xl"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.55 0.1 250 / 0.55), transparent 70%)",
        }}
      />
      <div
        // Oversized so the parallax shift never exposes an edge of the grid.
        className="cs-parallax cs-parallax-slow pointer-events-none absolute -inset-y-[8%] inset-x-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
    </>
  );
}

export const INK_BG = "bg-[oklch(0.28_0.056_248)]";
export const SURFACE_BG = "bg-[oklch(0.985_0.004_260)]";
