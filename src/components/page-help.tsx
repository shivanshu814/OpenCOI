"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleHelp } from "lucide-react";

/** Subtle hover tip for page-level “what is this?” detail. */
export function PageHelp({
  label = "More about this page",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors"
          aria-label={label}
        >
          <CircleHelp className="size-3.5" strokeWidth={1.75} />
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className="bg-ink text-ink-foreground max-w-xs px-3 py-2 text-left text-xs leading-relaxed"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
