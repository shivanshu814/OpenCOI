"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root error boundary — catches errors thrown in the root layout that the
 * per-segment `error.tsx` boundaries cannot. Reports to Sentry (no-op without a
 * DSN) and renders a minimal standalone document.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "2rem",
          background: "#fafafa",
          color: "#0a0a0a",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#525252", lineHeight: 1.5, marginBottom: 20 }}>
            We hit an unexpected error. Try again. If it keeps happening, email
            support@getcertshield.com{error.digest ? ` (ref ${error.digest})` : ""}.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              background: "#00B884",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
