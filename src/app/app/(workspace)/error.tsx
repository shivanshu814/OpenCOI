"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reportClientError } from "@/lib/lazy-sentry";
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
    reportClientError(error);
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-20">
      <Card className="text-center">
        <CardHeader className="justify-items-center gap-2">
          <span className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-full">
            <TriangleAlert className="size-5" />
          </span>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Something went wrong
          </CardTitle>
          <CardDescription className="leading-relaxed">
            We hit an unexpected error. Try again. If it keeps happening, email
            hello@getcertshield.app with the time it occurred.
          </CardDescription>
        </CardHeader>
        {error.digest ? (
          <CardContent>
            <p className="text-muted-foreground bg-muted mx-auto inline-block rounded px-2 py-1 font-mono text-xs">
              {error.digest}
            </p>
          </CardContent>
        ) : null}
        <CardFooter className="justify-center">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
