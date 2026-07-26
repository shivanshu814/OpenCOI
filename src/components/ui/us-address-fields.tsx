"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FALLBACK_US_STATES,
  isValidZip,
  toStateItems,
  type UsState,
} from "@/lib/geo/us-states";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import * as React from "react";

/**
 * Street / city / state / ZIP, with city and state filled in from the ZIP.
 *
 * Typing a ZIP is one action; typing "Philadelphia" + picking "PA" is three,
 * and a mistyped state quietly breaks the D1 certificate-holder wording check
 * later. So the ZIP drives the other two, while every field stays editable —
 * lookup is a convenience, never a gate. If the lookup service is down the
 * form behaves exactly as it did before.
 */

export type UsAddress = {
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
};

type Status = "idle" | "looking" | "filled" | "failed";

export function UsAddressFields({
  value,
  onChange,
  idPrefix = "addr",
  streetLabel = "Street address",
  className,
  disabled = false,
}: {
  value: UsAddress;
  onChange: (next: UsAddress) => void;
  /** Keeps ids unique when two address blocks share a page. */
  idPrefix?: string;
  streetLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = React.useState<Status>("idle");
  // States come from /api/geo/states (public dataset, cached a day). The
  // bundled list only renders until that lands, and stands in if it fails —
  // the picker is never empty.
  const [states, setStates] = React.useState<readonly UsState[]>(
    FALLBACK_US_STATES,
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/geo/states");
        const data = (await res.json()) as { states?: UsState[] };
        if (!cancelled && data.states?.length) setStates(data.states);
      } catch {
        // Keep the bundled list.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stateItems = React.useMemo(() => toStateItems(states), [states]);
  const [message, setMessage] = React.useState<string | null>(null);

  // Guards against a slow lookup for an old ZIP overwriting a newer one.
  const requestSeq = React.useRef(0);

  const set = (patch: Partial<UsAddress>) => onChange({ ...value, ...patch });

  const lookup = React.useCallback(
    async (zip: string) => {
      if (!isValidZip(zip)) {
        setStatus("idle");
        setMessage(null);
        return;
      }
      const seq = ++requestSeq.current;
      setStatus("looking");
      setMessage(null);
      try {
        const res = await fetch(`/api/geo/zip?zip=${encodeURIComponent(zip)}`);
        const data = (await res.json()) as {
          found?: boolean;
          city?: string;
          state?: string;
          error?: string;
        };
        if (seq !== requestSeq.current) return; // Superseded.

        if (!res.ok || !data.found || !data.city || !data.state) {
          setStatus("failed");
          setMessage(data.error ?? "Could not look up that ZIP.");
          return;
        }
        onChange({
          ...value,
          postal_code: zip,
          city: data.city,
          state: data.state,
        });
        setStatus("filled");
        setMessage(null);
      } catch {
        if (seq !== requestSeq.current) return;
        setStatus("failed");
        setMessage("Address lookup is unavailable — enter city and state.");
      }
    },
    [onChange, value],
  );

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-line`}>{streetLabel}</Label>
        <Input
          id={`${idPrefix}-line`}
          value={value.address_line}
          disabled={disabled}
          onChange={(e) => set({ address_line: e.target.value })}
          placeholder="1200 Market St, Suite 400"
          autoComplete="address-line1"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-zip`} className="flex items-center gap-1.5">
          ZIP
          {status === "looking" ? (
            <Loader2 className="text-muted-foreground size-3 animate-spin" />
          ) : null}
          {status === "filled" ? (
            <Check className="text-[var(--status-ok)] size-3" />
          ) : null}
        </Label>
        <Input
          id={`${idPrefix}-zip`}
          value={value.postal_code}
          disabled={disabled}
          inputMode="numeric"
          maxLength={10}
          autoComplete="postal-code"
          placeholder="19107"
          onChange={(e) => {
            const zip = e.target.value;
            set({ postal_code: zip });
            if (status !== "idle") setStatus("idle");
            // Fire as soon as it is a complete ZIP; no debounce needed since
            // a 5-digit value is only reached once per entry.
            if (isValidZip(zip)) void lookup(zip);
          }}
          onBlur={() => {
            if (isValidZip(value.postal_code) && !value.city) {
              void lookup(value.postal_code);
            }
          }}
        />
        <p
          className={cn(
            "text-xs leading-relaxed",
            status === "failed"
              ? "text-[var(--status-warn)]"
              : "text-muted-foreground",
          )}
        >
          {message ?? "City and state fill in automatically."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`}>City</Label>
        <Input
          id={`${idPrefix}-city`}
          value={value.city}
          disabled={disabled}
          autoComplete="address-level2"
          onChange={(e) => set({ city: e.target.value })}
          placeholder="Philadelphia"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-state`}>State</Label>
        <Select
          items={stateItems}
          value={value.state || null}
          disabled={disabled}
          onValueChange={(next) => set({ state: next ?? "" })}
        >
          <SelectTrigger id={`${idPrefix}-state`} className="w-full sm:max-w-xs">
            <SelectValue placeholder="Select a state" />
          </SelectTrigger>
          <SelectContent>
            {stateItems.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
