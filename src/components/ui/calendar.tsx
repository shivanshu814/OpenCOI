"use client";

import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const NAV_BUTTON_CLASS =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40";

/**
 * CertShield-branded calendar (react-day-picker). Fully styled via classNames
 * so no vendor stylesheet is needed — mint brand selection, tabular numerals,
 * dark/light through existing tokens.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "w-full space-y-3",
        month_caption: "flex h-8 items-center justify-center px-9",
        caption_label: "text-sm font-semibold tracking-tight",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: NAV_BUTTON_CLASS,
        button_next: NAV_BUTTON_CLASS,
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 pb-1.5 text-center text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase",
        week: "mt-0.5 flex",
        day: "p-0 text-center",
        day_button:
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-sm tabular-nums transition-colors select-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected:
          "[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:shadow-sm [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today:
          "[&>button]:ring-1 [&>button]:ring-brand/50 [&>button]:ring-inset",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-40",
        hidden: "invisible",
        footer: "pt-2 text-xs text-muted-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...rest }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeftIcon
              : orientation === "right"
                ? ChevronRightIcon
                : ChevronDownIcon;
          return <Icon className={cn("size-4", chevronClassName)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
