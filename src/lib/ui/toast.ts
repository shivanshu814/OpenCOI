/**
 * CertShield feedback helpers (sonner).
 *
 * Feedback & toast policy (interaction → pattern):
 * - Toast (transient): side-effect on the same page — chase/agent/owner email,
 *   correction saved, invite, API key/webhook, vendor added, clipboard copy,
 *   settings save. Success copy names the concrete outcome.
 * - Inline field/form error: validation (missing email, bad URL, required) —
 *   stays near the control; do not toast away.
 * - Inline persistent alert/banner: state that must not vanish — extraction
 *   failed mid-pipeline, FAIL/MISSING needs review, plan limits, missing
 *   Postmark/Twilio/credentials, one-time API key/secret reveal.
 * - Route change: upload → review (or create → detail) — no success toast;
 *   destination UI is the confirmation. Errors stay inline or toast once.
 * - Loading: button spinner + disabled; long jobs use the pipeline tracker.
 *
 * Honesty: never toast "Sent" when transport/demo skipped the send. Prefer
 * the API's real error/reason over a generic fallback. Critical state is never
 * toast-only (alerts/banners remain). Disclaimer and "customer final approver"
 * copy stay untouched.
 */
import { toast } from "sonner";

const DURATION_MS = {
  success: 4500,
  info: 5000,
  warning: 6000,
  error: 7500,
} as const;

export type NotifyOptions = {
  description?: string;
  duration?: number;
  id?: string | number;
};

export function notifySuccess(message: string, options?: NotifyOptions) {
  return toast.success(message, {
    duration: options?.duration ?? DURATION_MS.success,
    description: options?.description,
    id: options?.id,
  });
}

export function notifyInfo(message: string, options?: NotifyOptions) {
  return toast.message(message, {
    duration: options?.duration ?? DURATION_MS.info,
    description: options?.description,
    id: options?.id,
  });
}

export function notifyWarning(message: string, options?: NotifyOptions) {
  return toast.warning(message, {
    duration: options?.duration ?? DURATION_MS.warning,
    description: options?.description,
    id: options?.id,
  });
}

export function notifyError(message: string, options?: NotifyOptions) {
  return toast.error(message, {
    duration: options?.duration ?? DURATION_MS.error,
    description: options?.description,
    id: options?.id,
  });
}

/** Prefer API reason/error/message; never invent a vaguer line when one exists. */
export function apiErrorMessage(
  data: {
    error?: string;
    reason?: string | null;
    message?: string;
    note?: string;
  } | null
    | undefined,
  fallback: string,
): string {
  const msg =
    data?.error?.trim() ||
    data?.reason?.trim() ||
    data?.message?.trim() ||
    data?.note?.trim();
  return msg || fallback;
}

export function notifyApiError(
  data: {
    error?: string;
    reason?: string | null;
    message?: string;
    note?: string;
  } | null
    | undefined,
  fallback: string,
  options?: NotifyOptions,
) {
  return notifyError(apiErrorMessage(data, fallback), options);
}

/** Network / thrown errors — keep the real message when present. */
export function notifyCaughtError(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.trim()) {
    return notifyError(err.message);
  }
  return notifyError(fallback);
}

/**
 * Email/SMS side effects that returned `demo: true` or skipped send.
 * Never celebrate these as delivered.
 */
export function notifyNotSent(
  reason?: string | null,
  fallback = "Not sent — email transport is not configured.",
) {
  return notifyWarning(reason?.trim() || fallback);
}
