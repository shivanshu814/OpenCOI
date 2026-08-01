import Link from "next/link";

export type FaqEntry = {
  q: string;
  a: string;
  link?: { href: string; label: string };
};

export function FaqAccordion({ items }: { items: readonly FaqEntry[] }) {
  return (
    <div className="divide-border/60 border-border/60 divide-y border-y">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="marker:hidden list-none cursor-pointer py-5 text-sm font-semibold tracking-tight outline-none">
            <span className="flex items-start justify-between gap-4">
              <span>{item.q}</span>
              <span
                aria-hidden
                className="text-muted-foreground mt-0.5 shrink-0 text-base transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <div className="text-muted-foreground -mt-1 pb-5 text-sm leading-relaxed">
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
          </div>
        </details>
      ))}
    </div>
  );
}
