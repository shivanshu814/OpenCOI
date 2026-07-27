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
import { CACHE_POLICIES } from "@/lib/live/policy";
import { useCachedResource } from "@/lib/live/use-live";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Check, MapPin } from "lucide-react";
import * as React from "react";

/**
 * Street / city / state / ZIP, with guided US address entry.
 *
 * Users can start from either side: ZIP fills city/state, state opens city
 * suggestions, city returns ZIP options, and street typing offers full
 * address matches. Every field stays editable — lookup is a convenience,
 * never a gate. If a public lookup service is down the form behaves exactly
 * as it did before.
 */

export type UsAddress = {
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
};

type Status = "idle" | "looking" | "filled" | "failed";

type AddressSuggestion = UsAddress & {
  label: string;
};

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
  const [cityStatus, setCityStatus] = React.useState<Status>("idle");
  const [zipStatus, setZipStatus] = React.useState<Status>("idle");
  const [addressStatus, setAddressStatus] = React.useState<Status>("idle");
  const [cityOptions, setCityOptions] = React.useState<string[]>([]);
  const [zipOptions, setZipOptions] = React.useState<string[]>([]);
  const [addressOptions, setAddressOptions] = React.useState<
    AddressSuggestion[]
  >([]);
  const [cityOpen, setCityOpen] = React.useState(false);
  const [addressOpen, setAddressOpen] = React.useState(false);

  // The state list is public and effectively frozen, yet this component
  // mounts on several forms and used to re-request it every single time.
  // Cached under the `geoStates` policy (7 days, shared across orgs) and
  // de-duplicated in flight, so it costs one request per week per browser.
  // The bundled list still renders until it lands and stands in if it fails —
  // the picker is never empty.
  const { data: geo } = useCachedResource(CACHE_POLICIES.geoStates, async () => {
    const res = await fetch("/api/geo/states");
    const json = (await res.json()) as { states?: UsState[] };
    if (!json.states?.length) throw new Error("No states returned");
    return json.states;
  });

  const stateItems = React.useMemo(
    () => toStateItems(geo ?? FALLBACK_US_STATES),
    [geo],
  );
  const [message, setMessage] = React.useState<string | null>(null);
  const [cityMessage, setCityMessage] = React.useState<string | null>(null);
  const [zipMessage, setZipMessage] = React.useState<string | null>(null);

  // Guards against a slow lookup for an old ZIP overwriting a newer one.
  const requestSeq = React.useRef(0);
  const citySeq = React.useRef(0);
  const zipSeq = React.useRef(0);
  const addressSeq = React.useRef(0);

  const set = (patch: Partial<UsAddress>) => onChange({ ...value, ...patch });

  const visibleCityOptions = React.useMemo(() => {
    const query = value.city.trim().toLowerCase();
    const options = query
      ? cityOptions.filter((city) => city.toLowerCase().includes(query))
      : cityOptions;
    return options.slice(0, 60);
  }, [cityOptions, value.city]);

  React.useEffect(() => {
    if (!value.state) {
      const timer = window.setTimeout(() => {
        setCityOptions([]);
        setCityStatus("idle");
        setCityMessage(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const seq = ++citySeq.current;
    const timer = window.setTimeout(() => {
      setCityStatus("looking");
      setCityMessage(null);
    }, 0);

    void (async () => {
      try {
        const res = await fetch(
          `/api/geo/cities?state=${encodeURIComponent(value.state)}`,
        );
        const data = (await res.json()) as { cities?: string[] };
        if (seq !== citySeq.current) return;

        const cities = data.cities ?? [];
        setCityOptions(cities);
        setCityStatus(cities.length ? "filled" : "failed");
        setCityMessage(
          cities.length
            ? "Choose a city to look up ZIP options."
            : "City suggestions are unavailable — type the city manually.",
        );
      } catch {
        if (seq !== citySeq.current) return;
        setCityOptions([]);
        setCityStatus("failed");
        setCityMessage("City suggestions are unavailable — type the city.");
      }
    })();

    return () => window.clearTimeout(timer);
  }, [value.state]);

  const lookupZips = React.useCallback(
    async (state: string, city: string) => {
      if (!state || !city.trim()) {
        setZipOptions([]);
        setZipStatus("idle");
        setZipMessage(null);
        return;
      }

      const seq = ++zipSeq.current;
      setZipStatus("looking");
      setZipMessage(null);

      try {
        const res = await fetch(
          `/api/geo/zips?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city.trim())}`,
        );
        const data = (await res.json()) as { zips?: string[] };
        if (seq !== zipSeq.current) return;

        const zips = data.zips ?? [];
        setZipOptions(zips);

        if (zips.length === 1) {
          onChange({ ...value, state, city, postal_code: zips[0] });
          setZipStatus("filled");
          setZipMessage("ZIP filled from the selected city.");
          return;
        }

        if (zips.length > 1) {
          onChange({
            ...value,
            state,
            city,
            postal_code: value.postal_code || zips[0],
          });
          setZipStatus("filled");
          setZipMessage(
            "This city has multiple ZIPs. We filled the first match; pick another if needed.",
          );
          return;
        }

        setZipStatus("failed");
        setZipMessage("No ZIP suggestion found — enter it manually.");
      } catch {
        if (seq !== zipSeq.current) return;
        setZipOptions([]);
        setZipStatus("failed");
        setZipMessage("ZIP lookup is unavailable — enter it manually.");
      }
    },
    [onChange, value],
  );

  React.useEffect(() => {
    const q = value.address_line.trim();
    if (disabled || q.length < 4) {
      const timer = window.setTimeout(() => {
        setAddressOptions([]);
        setAddressStatus("idle");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const seq = ++addressSeq.current;
    const timer = window.setTimeout(() => {
      setAddressStatus("looking");
      void (async () => {
        try {
          const params = new URLSearchParams({ q });
          if (value.state) params.set("state", value.state);
          if (value.city) params.set("city", value.city);
          const res = await fetch(`/api/geo/address?${params.toString()}`);
          const data = (await res.json()) as {
            suggestions?: AddressSuggestion[];
          };
          if (seq !== addressSeq.current) return;

          const suggestions = data.suggestions ?? [];
          setAddressOptions(suggestions);
          setAddressStatus(suggestions.length ? "filled" : "idle");
          setAddressOpen(suggestions.length > 0);
        } catch {
          if (seq !== addressSeq.current) return;
          setAddressOptions([]);
          setAddressStatus("failed");
        }
      })();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [disabled, value.address_line, value.city, value.state]);

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
        <div className="relative">
          <Input
            id={`${idPrefix}-line`}
            value={value.address_line}
            disabled={disabled}
            onFocus={() => setAddressOpen(addressOptions.length > 0)}
            onChange={(e) => {
              set({ address_line: e.target.value });
              setAddressOpen(true);
            }}
            placeholder="1200 Market St, Suite 400"
            autoComplete="address-line1"
          />
          {addressStatus === "looking" ? (
            <Spinner size={16} className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2" />
          ) : null}
          {addressOpen && addressOptions.length ? (
            <div className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5">
              {addressOptions.map((option) => (
                <button
                  key={`${option.address_line}-${option.city}-${option.state}-${option.postal_code}`}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(option);
                    setAddressOpen(false);
                    setAddressOptions([]);
                    setStatus("filled");
                    setZipStatus("filled");
                    setZipMessage("ZIP filled from the selected address.");
                  }}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {option.address_line}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {option.city}, {option.state} {option.postal_code}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-zip`} className="flex items-center gap-1.5">
          ZIP
          {status === "looking" ? (
            <Spinner size={12} className="text-muted-foreground" />
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
            setZipMessage(null);
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
          {message ??
            zipMessage ??
            "ZIP fills city/state; city or address can suggest ZIP too."}
        </p>
        {zipOptions.length > 1 ? (
          <div className="flex max-h-20 flex-wrap gap-1 overflow-auto">
            {zipOptions.slice(0, 24).map((zip) => (
              <button
                key={zip}
                type="button"
                disabled={disabled}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  value.postal_code === zip
                    ? "border-brand bg-brand/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-brand/40 hover:text-foreground",
                )}
                onClick={() => {
                  set({ postal_code: zip });
                  setZipStatus("filled");
                  setZipMessage("ZIP selected.");
                }}
              >
                {zip}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-city`} className="flex items-center gap-1.5">
          City
          {cityStatus === "looking" ? (
            <Spinner size={12} className="text-muted-foreground" />
          ) : null}
          {zipStatus === "looking" ? (
            <Spinner size={12} className="text-muted-foreground" />
          ) : null}
        </Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-city`}
            value={value.city}
            disabled={disabled}
            autoComplete="address-level2"
            onFocus={() => setCityOpen(Boolean(value.state))}
            onChange={(e) => {
              const city = e.target.value;
              set({ city });
              setCityOpen(Boolean(value.state));
              setZipOptions([]);
              setZipMessage(null);
            }}
            onBlur={() => {
              window.setTimeout(() => setCityOpen(false), 120);
              if (value.state && value.city.trim()) {
                void lookupZips(value.state, value.city);
              }
            }}
            placeholder={
              value.state ? "Choose or type a city" : "Select state first"
            }
          />
          {cityOpen && visibleCityOptions.length ? (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5">
              {visibleCityOptions.map((city) => (
                <button
                  key={city}
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ ...value, city });
                    setCityOpen(false);
                    void lookupZips(value.state, city);
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {cityMessage ??
            (value.state
              ? "City suggestions appear after state selection."
              : "Select a state to load cities.")}
        </p>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-state`}>State</Label>
        <Select
          items={stateItems}
          value={value.state || null}
          disabled={disabled}
          onValueChange={(next) => {
            const state = next ?? "";
            onChange({ ...value, state, city: "", postal_code: "" });
            setCityOpen(Boolean(state));
            setZipOptions([]);
            setZipMessage(null);
            setStatus("idle");
          }}
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
