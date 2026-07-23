"use client";

import { Button } from "@/components/ui/button";

export function DownloadOwnerReportButton({
  propertyId,
  label = "Owner report PDF",
}: {
  propertyId: string;
  label?: string;
}) {
  const href = `/api/reports/owner?propertyId=${encodeURIComponent(propertyId)}`;

  return (
    <Button variant="outline" size="sm" render={<a href={href} download />}>
      {label}
    </Button>
  );
}
