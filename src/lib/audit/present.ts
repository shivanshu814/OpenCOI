/** Summarize before/after JSON for audit UI (admin gets more; non-admin gets safe). */

const SENSITIVE_KEYS = new Set([
  "tin",
  "tin_encrypted",
  "ssn",
  "ein",
  "api_key",
  "api_key_hash",
  "secret",
  "token",
  "password",
  "webhook_secret",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function scrubValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) return "[redacted]";
  if (typeof value === "string" && value.length > 240) {
    return `${value.slice(0, 237)}…`;
  }
  return value;
}

/** Flatten a few top-level keys into "key: value · key: value". */
export function summarizeState(
  state: unknown,
  opts?: { maxKeys?: number; forAdmin?: boolean },
): string | null {
  if (state == null) return null;
  if (typeof state === "string") {
    return state.length > 160 ? `${state.slice(0, 157)}…` : state;
  }
  if (typeof state === "number" || typeof state === "boolean") {
    return String(state);
  }
  if (!isPlainObject(state)) {
    try {
      const s = JSON.stringify(state);
      return s.length > 160 ? `${s.slice(0, 157)}…` : s;
    } catch {
      return null;
    }
  }

  const maxKeys = opts?.maxKeys ?? (opts?.forAdmin ? 8 : 5);
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(state)) {
    if (key.startsWith("_")) continue;
    if (!opts?.forAdmin && SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    const value = scrubValue(key, raw);
    if (value == null) continue;
    if (isPlainObject(value) || Array.isArray(value)) {
      parts.push(`${key}: {…}`);
    } else {
      parts.push(`${key}: ${String(value)}`);
    }
    if (parts.length >= maxKeys) break;
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

/** Pull a human "why" from reason column or common after_state keys. */
export function extractWhy(
  reason: string | null,
  afterState: unknown,
): string | null {
  if (reason?.trim()) return reason.trim();
  if (!isPlainObject(afterState)) return null;
  const candidates = [
    afterState.reason,
    afterState.why,
    afterState.note,
    afterState.message,
    afterState.override_reason,
    afterState.decision_reason,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export function formatTimestampDetailed(iso: string): {
  absolute: string;
  relative: string;
  timezone: string;
} {
  const d = new Date(iso);
  const tz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "local timezone";
  const absolute = d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZoneName: "short",
  });
  return {
    absolute,
    relative: formatRelativeTime(d),
    timezone: tz,
  };
}

function formatRelativeTime(d: Date): string {
  const now = Date.now();
  const diffSec = Math.round((now - d.getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) {
    const m = Math.max(1, Math.round(diffSec / 60));
    return `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.max(1, Math.round(diffSec / 3600));
    return `${h}h ago`;
  }
  if (diffSec < 86400 * 7) {
    const days = Math.max(1, Math.round(diffSec / 86400));
    return `${days}d ago`;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Truncate UA for display. */
export function shortUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  if (ua.length <= 72) return ua;
  return `${ua.slice(0, 69)}…`;
}
