"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Disclosure list built on Base UI, replacing native `<details>/<summary>`.
 *
 * Native disclosure widgets animate differently per browser, expose a UA
 * marker that has to be fought with vendor selectors, and cannot be driven
 * from React state — so every disclosure in the product uses this instead.
 */
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("w-full", className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-start justify-between gap-4 rounded-md py-5 text-left text-sm font-semibold tracking-tight outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/40",
          className,
        )}
        {...props}
      >
        {children}
        <PlusIcon
          aria-hidden
          className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform duration-200 group-data-panel-open:rotate-45"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div
        className={cn(
          "text-muted-foreground pb-5 text-sm leading-relaxed",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
