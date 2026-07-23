"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        We hit an unexpected error. Try again. If it keeps happening, email
        support@getcertshield.com with the time it occurred.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">
          {error.digest}
        </p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
