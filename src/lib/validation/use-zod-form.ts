"use client";

/**
 * Inline field validation for the workspace forms, driven by the same schema
 * the API route uses (see `./schemas`).
 *
 * Behaviour is deliberately quiet-until-relevant: an error appears once the
 * field has been blurred, or once the user has tried to submit. Nobody wants
 * "Vendor name is required." shouted at them before they have typed a letter.
 */

import { useCallback, useMemo, useState } from "react";
import type { z } from "zod";
import { fieldErrorsFrom } from "./schemas";

export type ZodFormState<T> = {
  /** True when the current values satisfy the schema. */
  valid: boolean;
  /** Parsed (trimmed/normalized) values, or null while invalid. */
  data: T | null;
  /** Message for a field, but only once it is blurred or submit was attempted. */
  errorFor: (field: string) => string | undefined;
  /**
   * Message regardless of touched state — for fields that were already
   * validated live before this hook existed (accent color, logo URL, company
   * name), where hiding the error would be a regression.
   */
  errorForAlways: (field: string) => string | undefined;
  /** Mark a field blurred so its error may show. */
  markTouched: (field: string) => void;
  /** Reveal every error — call at the top of submit. */
  markSubmitted: () => void;
  /** Clear touched/submitted state after a successful save. */
  reset: () => void;
};

export function useZodForm<T>(
  schema: z.ZodType<T>,
  values: unknown,
): ZodFormState<T> {
  const [touched, setTouched] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [submitted, setSubmitted] = useState(false);

  // `values` is rebuilt every render, so memoize on a stable serialization
  // rather than identity — otherwise every unrelated re-render re-parses.
  const key = safeKey(values);
  const result = useMemo(
    () => schema.safeParse(values),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema, key],
  );

  const errors = useMemo(
    () => (result.success ? {} : fieldErrorsFrom(result.error)),
    [result],
  );

  const errorFor = useCallback(
    (field: string) =>
      submitted || touched.has(field) ? errors[field] : undefined,
    [errors, submitted, touched],
  );

  const errorForAlways = useCallback(
    (field: string) => errors[field],
    [errors],
  );

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  const markSubmitted = useCallback(() => setSubmitted(true), []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setTouched(new Set<string>());
  }, []);

  return {
    valid: result.success,
    data: result.success ? result.data : null,
    errorFor,
    errorForAlways,
    markTouched,
    markSubmitted,
    reset,
  };
}

function safeKey(values: unknown): string {
  try {
    return JSON.stringify(values) ?? "undefined";
  } catch {
    // Cyclic or non-serializable values: fall back to always re-parsing.
    return String(Math.random());
  }
}
