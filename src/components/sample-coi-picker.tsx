"use client";

import { LiveBadge } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import {
  SAMPLE_COIS,
  loadSampleCoiFile,
  type SampleCoi,
} from "@/lib/samples/cois";
import { Download, FlaskConical } from "lucide-react";
import { useState } from "react";

type Props = {
  /** Called after a sample is loaded as a File (for upload forms). */
  onSelect: (file: File, sample: SampleCoi) => void;
  /** Compact EN/ES labels for vendor portal. */
  locale?: "en" | "es";
  className?: string;
};

const labels = {
  en: {
    title: "Sample COIs for testing",
    body: "No real cert handy? Use a sample PDF — or download it first.",
    use: "Use",
    download: "Download",
    loading: "Loading…",
  },
  es: {
    title: "COIs de prueba",
    body: "¿Sin certificado real? Use un PDF de muestra — o descárguelo.",
    use: "Usar",
    download: "Descargar",
    loading: "Cargando…",
  },
};

export function SampleCoiPicker({ onSelect, locale = "en", className }: Props) {
  const t = labels[locale];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applySample(sample: SampleCoi) {
    setBusyId(sample.id);
    setError(null);
    try {
      const file = await loadSampleCoiFile(sample);
      onSelect(file, sample);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className={`bg-muted/40 space-y-3 rounded-xl border border-dashed p-3 ${className ?? ""}`}
    >
      <div className="flex items-start gap-2">
        <FlaskConical
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{t.title}</p>
            <LiveBadge label="Samples" tone="info" />
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t.body}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {SAMPLE_COIS.map((sample) => (
          <li
            key={sample.id}
            className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{sample.label}</p>
              <p className="text-muted-foreground truncate text-xs">
                {sample.hint}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2"
                nativeButton={false}
                render={<a href={sample.href} download={sample.fileName} />}
              >
                <Download className="size-3.5" aria-hidden />
                {t.download}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5"
                disabled={busyId === sample.id}
                onClick={() => void applySample(sample)}
              >
                {busyId === sample.id ? t.loading : t.use}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
