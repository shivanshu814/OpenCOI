"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export function DownloadOwnerReportButton({
  propertyId,
  label = "Owner report PDF",
}: {
  propertyId: string;
  label?: string;
}) {
  const href = `/api/reports/owner?propertyId=${encodeURIComponent(propertyId)}`;

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
