import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

/**
 * The small uppercase label above every section heading, plus the hairline that
 * draws itself in beside it.
 *
 * This exists as a component for a reason beyond DRY: the markup was repeated
 * inline in every section, and the hairline's `.cs-rule` animation runs on load,
 * so every rule below the fold had already finished drawing before it was ever
 * seen. Wrapping the eyebrow in <Reveal> re-triggers the hairline on scroll-in
 * (see `.cs-reveal-in .cs-rule` in globals.css), and the label itself pulls
 * focus — blur clearing as it rises — which is affordable here because it's
 * three or four words, not a heading or a paragraph.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal
      as="p"
      animation="cs-focus-in"
      className={cn(
        "text-brand flex items-center gap-3 text-xs font-semibold tracking-[0.18em] uppercase",
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="cs-rule from-brand/50 h-px w-8 bg-gradient-to-r to-transparent"
      />
    </Reveal>
  );
}
