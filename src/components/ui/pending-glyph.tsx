import { cn } from "@/lib/utils";

/**
 * Purpose-built busy glyphs — no ring, no borrowed icon set.
 *
 * Each one is drawn here so its own geometry can move: the globe's meridians
 * sweep so the sphere genuinely turns, the page climbs out of frame and the
 * next one follows it, the check draws itself on. A generic spinner parked
 * next to a static icon says only "wait"; these say what is being done.
 *
 * Drawn on a 24 grid with `currentColor` strokes at the weight the rest of
 * the UI uses, so they sit in a button exactly like any other icon. Motion is
 * transform and stroke-dashoffset only (compositor-friendly), amplitudes are
 * small because this renders at ~16px, and every keyframe is switched off
 * under `prefers-reduced-motion` — see globals.css.
 */

export type PendingGlyphName =
  | "globe"
  | "mail"
  | "chat"
  | "upload"
  | "doc"
  | "spark"
  | "key"
  | "link"
  | "card"
  | "pen"
  | "shield"
  | "check"
  | "alert"
  | "user"
  | "building"
  | "folder"
  | "dots";

const S = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ name }: { name: PendingGlyphName }) {
  switch (name) {
    /** A sphere actually turning: meridians flatten and swell out of phase. */
    case "globe":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="9" ry="3.7" />
          <ellipse cx="12" cy="12" rx="8" ry="9" className="cs-g-meridian-a" />
          <ellipse
            cx="12"
            cy="12"
            rx="3.6"
            ry="9"
            className="cs-g-meridian-b"
          />
        </>
      );

    /** Sent, not sitting: the plane crosses and the next one follows. */
    case "mail":
      return (
        <>
          <path d="M3 12h3.5" className="cs-g-trail-a" />
          <path d="M2 15.5h2.5" className="cs-g-trail-b" />
          <path
            d="M3.4 10.8 20.6 3.4 12.2 20.6l-2.1-7.3z"
            className="cs-g-cross"
          />
        </>
      );

    /** A reply forming — the bubble holds while the dots think. */
    case "chat":
      return (
        <>
          <path d="M20.5 11.8a8 8 0 0 1-11.6 7.1L3.5 20.5l1.6-5.4A8 8 0 1 1 20.5 11.8Z" />
          <circle
            cx="8.6"
            cy="12"
            r="1.05"
            className="cs-g-dot-a"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="12"
            cy="12"
            r="1.05"
            className="cs-g-dot-b"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="15.4"
            cy="12"
            r="1.05"
            className="cs-g-dot-c"
            fill="currentColor"
            stroke="none"
          />
        </>
      );

    /** Leaving the tray: the arrow climbs out and another takes its place. */
    case "upload":
      return (
        <>
          <path d="M4 16.5v2.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
          <g className="cs-g-rise">
            <path d="M12 15.5V3.5" />
            <path d="m7.4 8.1 4.6-4.6 4.6 4.6" />
          </g>
        </>
      );

    /** The document itself travelling from here to there. */
    case "doc":
      return (
        <>
          <path d="M5 20.5h14" opacity={0.45} />
          <g className="cs-g-rise">
            <path d="M14.2 2.5H7.4a1.9 1.9 0 0 0-1.9 1.9v11.2a1.9 1.9 0 0 0 1.9 1.9h9.2a1.9 1.9 0 0 0 1.9-1.9V6.8z" />
            <path d="M14.2 2.5v4.3h4.3" />
          </g>
        </>
      );

    /** Something being worked out — two sparks catching light in turn. */
    case "spark":
      return (
        <>
          <path
            d="M11.5 3.2 13.4 8.6 18.8 10.5 13.4 12.4 11.5 17.8 9.6 12.4 4.2 10.5 9.6 8.6Z"
            className="cs-g-twinkle-a"
          />
          <path
            d="M18.2 15.2 19 17.4 21.2 18.2 19 19 18.2 21.2 17.4 19 15.2 18.2 17.4 17.4Z"
            className="cs-g-twinkle-b"
          />
        </>
      );

    /** A key in a lock, turning. */
    case "key":
      return (
        <g className="cs-g-turn">
          <circle cx="8.4" cy="15.6" r="4.1" />
          <path d="m11.3 12.7 8.2-8.2" />
          <path d="m16.6 7.4 2.1 2.1" />
          <path d="m19 5 2.1 2.1" />
        </g>
      );

    /** Two links of a chain rotating together — the webhook handshake. */
    case "link":
      return (
        <g className="cs-g-turn">
          <path d="M9.6 14.4a3.8 3.8 0 0 1 0-5.4l2.4-2.4a3.8 3.8 0 1 1 5.4 5.4l-1.2 1.2" />
          <path d="M14.4 9.6a3.8 3.8 0 0 1 0 5.4l-2.4 2.4a3.8 3.8 0 1 1-5.4-5.4l1.2-1.2" />
        </g>
      );

    /** A card going through the reader. */
    case "card":
      return (
        <>
          <path d="M3 20.5h18" />
          <g className="cs-g-swipe">
            <rect x="5" y="4" width="12.5" height="9" rx="1.6" />
            <path d="M5 7.6h12.5" />
          </g>
        </>
      );

    /** A pen mid-stroke, with the stroke appearing under it. */
    case "pen":
      return (
        <>
          <path d="M4 20.2h7.5" className="cs-g-draw" />
          <g className="cs-g-nib">
            <path d="m14.8 3.6 5.2 5.2L9.6 19.2H4.4v-5.2z" />
            <path d="m13.1 5.3 5.2 5.2" />
          </g>
        </>
      );

    /** A verdict being sealed: the shield holds, the mark is drawn on. */
    case "shield":
      return (
        <>
          <path d="M12 2.4 20 5.7v6.1c0 4.9-3.4 8.4-8 9.6-4.6-1.2-8-4.7-8-9.6V5.7z" />
          <path d="m8.4 11.9 2.6 2.6 4.6-5" className="cs-g-draw" />
        </>
      );

    /** Plain confirmation, drawn rather than stamped — no ring. */
    case "check":
      return <path d="m4.8 12.2 4.4 4.4 10-10.2" className="cs-g-draw" />;

    /** Attention, without the jitter of a shake. */
    case "alert":
      return (
        <g className="cs-g-throb">
          <path d="M12 3.6 21.4 20H2.6z" />
          <path d="M12 9.6v4.2" />
          <path d="M12 16.9h.01" />
        </g>
      );

    /** A record joining the set. */
    case "user":
      return (
        <>
          <circle cx="10" cy="8" r="3.7" />
          <path d="M3.6 20.4a6.6 6.6 0 0 1 12.8 0" />
          <g className="cs-g-throb">
            <path d="M18.6 5.4v5" />
            <path d="M16.1 7.9h5" />
          </g>
        </>
      );

    /** Saving a property / org — the facade holds while the mark settles. */
    case "building":
      return (
        <g className="cs-g-throb">
          <path d="M4.5 20.5V7.2L12 3.4l7.5 3.8v13.3" />
          <path d="M9.2 20.5V14h5.6v6.5" />
          <path d="M8 10.2h.01" />
          <path d="M12 10.2h.01" />
          <path d="M16 10.2h.01" />
        </g>
      );

    /** A project folder closing into place. */
    case "folder":
      return (
        <g className="cs-g-rise">
          <path d="M3.5 8.2V18a1.8 1.8 0 0 0 1.8 1.8h13.4A1.8 1.8 0 0 0 20.5 18V10a1.8 1.8 0 0 0-1.8-1.8h-7.1L9.4 5.8H5.3A1.8 1.8 0 0 0 3.5 7.6v.6" />
        </g>
      );

    /** Neutral fallback when no verb fits. */
    case "dots":
      return (
        <>
          <circle
            cx="5.5"
            cy="12"
            r="1.9"
            className="cs-g-dot-a"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="12"
            cy="12"
            r="1.9"
            className="cs-g-dot-b"
            fill="currentColor"
            stroke="none"
          />
          <circle
            cx="18.5"
            cy="12"
            r="1.9"
            className="cs-g-dot-c"
            fill="currentColor"
            stroke="none"
          />
        </>
      );
  }
}

export function PendingGlyph({
  name,
  size = 16,
  className,
  label = "Working",
}: {
  name: PendingGlyphName;
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0 overflow-visible", className)}
      role="status"
      aria-label={label}
      {...S}
    >
      <Glyph name={name} />
    </svg>
  );
}
