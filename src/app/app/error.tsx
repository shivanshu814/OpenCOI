"use client";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
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
    <div className="mx-auto max-w-md py-20 text-center">
      <span className="bg-destructive/10 text-destructive mx-auto flex size-10 items-center justify-center rounded-full">
        <TriangleAlert className="size-5" />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        We hit an unexpected error. Try again. If it keeps happening, email
        support@getcertshield.com with the time it occurred.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground bg-muted mx-auto mt-3 inline-block rounded px-2 py-1 font-mono text-xs">
          {error.digest}
        </p>
      ) : null}
      <div className="mt-6">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
