import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Pixel size of the mark (square). */
  size?: number;
  /** White tile + brand glyph — for colored/dark panels when needed. */
  inverted?: boolean;
  title?: string;
};

/**
 * CertShield mark — rounded square + shield with check (Kryptos-style tile).
 * Default: mint tile `#00B884` + white glyph. Use on light AND dark chrome.
 */
export function CertShieldMark({
  className,
  size = 32,
  inverted = false,
  title = "CertShield",
}: LogoProps) {
  const tile = inverted ? "#FFFFFF" : "#00B884";
  const glyph = inverted ? "#00B884" : "#FFFFFF";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="36" height="36" rx="8" fill={tile} />
      <path
        d="M18 7.2C18 7.2 11.25 9.45 11.25 9.45V17.7C11.25 22.2 14.55 26.1 18 27.3C21.45 26.1 24.75 22.2 24.75 17.7V9.45C24.75 9.45 18 7.2 18 7.2Z"
        fill={glyph}
      />
      <path
        d="M15.2 17.55L16.95 19.3L20.95 14.7"
        stroke={tile}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wordmark + mark used in marketing, auth, and shell. */
export function BrandMark({
  className,
  markSize = 28,
  inverted = false,
  showWordmark = true,
  wordmarkClassName,
}: {
  className?: string;
  markSize?: number;
  inverted?: boolean;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CertShieldMark size={markSize} inverted={inverted} />
      {showWordmark ? (
        <span
          className={cn(
            "text-base font-semibold tracking-tight",
            inverted ? "text-white" : "text-foreground",
            wordmarkClassName,
          )}
        >
          CertShield
        </span>
      ) : null}
    </span>
  );
}
