"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export function DownloadReportButton({
  vendorId,
  documentId,
  label = "Download report PDF",
}: {
  vendorId: string;
  documentId?: string;
  label?: string;
}) {
  const params = new URLSearchParams({ vendorId });
  if (documentId) params.set("documentId", documentId);
  const href = `/api/reports/compliance?${params.toString()}`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      render={<a href={href} download />}
    >
      <FileDown className="size-3.5" strokeWidth={2.25} aria-hidden />
      {label}
    </Button>
  );
}
