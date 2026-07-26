import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { listVendors } from "@/lib/data/documents";
import { Suspense } from "react";
import UploadPage from "./upload-client";

export default async function Page() {
  const vendors = await listVendors();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Upload COI"
        description="Pick a vendor, drop the certificate PDF, and queue extraction."
        live
        liveLabel="Ready"
      />

      <Suspense
        fallback={
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Skeleton className="h-72 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        }
      >
        <UploadPage vendors={vendors} />
      </Suspense>
    </div>
  );
}
