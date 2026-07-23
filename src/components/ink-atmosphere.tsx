import { cn } from "@/lib/utils";

/** Shared ink atmosphere used across marketing surfaces. */
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
        className={cn("pointer-events-none absolute inset-0 opacity-40", className)}
        style={{ backgroundImage: glow }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
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

export const INK_BG = "bg-[oklch(0.22_0.03_260)]";
export const SURFACE_BG = "bg-[oklch(0.985_0.004_260)]";
