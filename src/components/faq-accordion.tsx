"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type FaqEntry = { q: string; a: string };

/** Landing-page FAQ. SEO note: answers stay in the DOM, collapsed height only. */
export function FaqAccordion({ items }: { items: readonly FaqEntry[] }) {
  return (
    <Accordion className="divide-border/60 border-border/60 divide-y border-y">
      {items.map((item) => (
        <AccordionItem key={item.q} value={item.q} className="border-b-0">
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
