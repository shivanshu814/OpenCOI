"use client";

import { cn } from "@/lib/utils";
import { FileText, FileUp, X } from "lucide-react";
import * as React from "react";

/**
 * Certificate picker: drag-and-drop surface + keyboard-reachable browse.
 *
 * The `<input type="file">` stays in the DOM (nothing else can open the OS file
 * picker) but is visually hidden and carries no `required`/`accept` validation
 * of its own: the browser cannot render a validation bubble on a hidden control
 * and Chrome logs "An invalid form control is not focusable" instead of
 * submitting. Type and size are checked here and reported inline, so the same
 * message appears whether the file was dropped or browsed.
 */

export type FileDropzoneProps = {
  id: string;
  value: File | null;
  onChange: (file: File | null) => void;
  /** MIME types / extensions offered in the OS picker and enforced on drop. */
  accept: string;
  /** Rejected above this size, in megabytes. */
  maxSizeMb?: number;
  /** Reported inline when a file is rejected. */
  onReject?: (message: string) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Localized "file too large" / "wrong type" copy for the vendor portal. */
  messages?: { tooLarge?: (mb: number) => string; wrongType?: string };
  disabled?: boolean;
  className?: string;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesAccept(file: File, accept: string): boolean {
  const patterns = accept
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;

  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

export function FileDropzone({
  id,
  value,
  onChange,
  accept,
  maxSizeMb = 25,
  onReject,
  label,
  hint,
  messages,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function accept_(file: File) {
    if (!matchesAccept(file, accept)) {
      onReject?.(
        messages?.wrongType ??
          "That file type is not supported. Upload a PDF, PNG, or JPEG.",
      );
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      onReject?.(
        messages?.tooLarge?.(maxSizeMb) ??
          `That file is larger than ${maxSizeMb} MB. Upload a smaller scan.`,
      );
      return;
    }
    onChange(file);
  }

  function clear() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      data-slot="file-dropzone"
      data-dragging={dragging || undefined}
      className={cn(
        "relative rounded-xl border border-dashed transition-[background-color,border-color,box-shadow] duration-200",
        dragging
          ? "border-brand bg-brand/5 ring-3 ring-brand/15"
          : "bg-muted/30 hover:border-muted-foreground/40",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) accept_(dropped);
      }}
    >
      {value ? (
        <div className="animate-in fade-in-0 slide-in-from-bottom-1 flex items-center justify-between gap-3 px-4 py-4 duration-200">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-brand-muted text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
              <FileText className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{value.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatBytes(value.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/40 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center gap-1.5 px-4 py-8 text-center"
        >
          <FileUp
            className={cn(
              "size-6 transition-transform duration-200",
              dragging ? "text-brand scale-110" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span className="text-sm font-medium">{label}</span>
          {hint ? (
            <span className="text-muted-foreground max-w-sm text-xs leading-relaxed">
              {hint}
            </span>
          ) : null}
        </label>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) accept_(picked);
        }}
      />
    </div>
  );
}
