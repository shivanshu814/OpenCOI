"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

export type FaqEntry = {
  q: string;
  a: string;
  link?: { href: string; label: string };
};

/**
 * Homepage FAQ. Uses the shared Base UI accordion — never native
 * `<details>/<summary>`, which the smoke gate rejects on `/` and which
 * animate differently per browser.
 */
export function FaqAccordion({ items }: { items: readonly FaqEntry[] }) {
  return (
    <Accordion className="divide-border/60 border-border/60 divide-y border-y">
      {items.map((item) => (
        <AccordionItem
          key={item.q}
          value={item.q}
          className="border-border/60 border-b-0"
        >
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>
            {item.a}
            {item.link ? (
              <>
                {" "}
                <Link
                  href={item.link.href}
                  className="text-brand font-medium underline underline-offset-4"
                >
                  {item.link.label}
                </Link>
                .
              </>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
