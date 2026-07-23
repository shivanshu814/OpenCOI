"use client";

import { Button } from "@/components/ui/button";

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
    <Button variant="outline" size="sm" render={<a href={href} download />}>
      {label}
    </Button>
  );
}
