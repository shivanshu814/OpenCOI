"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  /** ISO date string (YYYY-MM-DD) or "" when unset — matches backend format. */
  value: string;
  /** Receives ISO YYYY-MM-DD, or "" when cleared. */
  onChange: (iso: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show the Clear action in the popover footer (default true). */
  clearable?: boolean;
  className?: string;
  "aria-label"?: string;
};

function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

/**
 * CertShield date picker: select-style trigger showing a human-readable US
 * date ("Jan 1, 2027"), calendar popover instead of native `type="date"`.
 * Stores/emits ISO YYYY-MM-DD for the backend.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled,
  clearable = true,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseIsoDate(value);
  const [month, setMonth] = React.useState<Date>(() => selected ?? new Date());

  function handleOpenChange(nextOpen: boolean) {
    // Open on the currently selected month, even if value changed externally.
    if (nextOpen) setMonth(parseIsoDate(value) ?? new Date());
    setOpen(nextOpen);
  }

  function select(date: Date | undefined) {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    if (date) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background py-2 pr-3 pl-3 text-left text-sm transition-colors outline-none select-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50",
          className,
        )}
      >
        <CalendarIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        {selected ? (
          <span className="truncate tabular-nums">
            {format(selected, "MMM d, yyyy")}
          </span>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          onSelect={select}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
          <button
            type="button"
            className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-accent"
            onClick={() => select(new Date())}
          >
            Today
          </button>
          {clearable && value ? (
            <button
              type="button"
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
