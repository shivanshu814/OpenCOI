import type { Block } from "@/content/blog/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Stable anchor id from heading text — used by the ToC and by deep links. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export function h2Headings(body: readonly Block[]): { text: string; id: string }[] {
  return body
    .filter((b): b is Extract<Block, { kind: "h2" }> => b.kind === "h2")
    .map((b) => ({ text: b.text, id: headingId(b.text) }));
}

/**
 * Renders one content block.
 *
 * Tables get their own `overflow-x-auto` wrapper rather than relying on the
 * page to scroll: a 4-column comparison table at 360px would otherwise push
 * the whole document sideways, which is both a layout bug and a Core Web
 * Vitals problem (horizontal shift on load).
 */
function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-muted-foreground text-[0.95rem] leading-[1.75]">
          {block.text}
        </p>
      );

    case "h2":
      return (
        <h2
          id={headingId(block.text)}
          className="scroll-mt-24 pt-6 text-xl font-semibold tracking-tight"
        >
          {block.text}
        </h2>
      );

    case "h3":
      return (
        <h3
          id={headingId(block.text)}
          className="scroll-mt-24 pt-2 text-base font-semibold tracking-tight"
        >
          {block.text}
        </h3>
      );

    case "ul":
      return (
        <ul className="text-muted-foreground marker:text-brand list-disc space-y-2 pl-5 text-[0.95rem] leading-[1.7]">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol className="text-muted-foreground marker:text-brand marker:font-semibold list-decimal space-y-2 pl-5 text-[0.95rem] leading-[1.7]">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );

    case "table":
      return (
        <figure className="my-2">
          <div className="border-border/80 bg-card overflow-x-auto rounded-xl border shadow-xs">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border/80 border-b">
                  {block.head.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 align-bottom text-xs font-semibold tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {block.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, i) => (
                      <td
                        key={`${i}-${cell}`}
                        className={
                          i === 0
                            ? "px-4 py-3 align-top font-medium"
                            : "text-muted-foreground px-4 py-3 align-top leading-relaxed"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption ? (
            <figcaption className="text-muted-foreground mt-2 text-xs">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );

    case "callout":
      return (
        <aside className="border-brand/30 bg-brand/[0.06] rounded-xl border p-5">
          <p className="text-sm font-semibold">{block.title}</p>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            {block.text}
          </p>
        </aside>
      );

    case "cta":
      return (
        <div className="border-border/80 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5 shadow-xs">
          <p className="text-sm leading-relaxed">{block.text}</p>
          <Link
            href={block.href}
            className="text-brand group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold"
          >
            {block.label}
            <ArrowRight
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={2.25}
              aria-hidden
            />
          </Link>
        </div>
      );
  }
}

export function ProseBlocks({ body }: { body: readonly Block[] }) {
  return (
    <div className="space-y-5">
      {body.map((block, i) => (
        <BlockView key={`${block.kind}-${i}`} block={block} />
      ))}
    </div>
  );
}
