import {
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { listVendors } from "@/lib/data/documents";
import Link from "next/link";
import { Suspense } from "react";
import UploadPage from "./upload-client";

export default async function Page() {
  const vendors = await listVendors();

  return (
    <PageFrame width="default">
      <PageHeader
        title="Upload COI"
        description="Drop a vendor's certificate PDF so CertShield can extract coverage and queue a verdict for review."
        audience="Anyone who receives COIs"
        nextStep={
          vendors.length === 0 ? (
            <>
              Add a vendor on{" "}
              <Link
                href="/app/vendors"
                className="text-foreground underline-offset-2 hover:underline"
              >
                Vendors
              </Link>{" "}
              first, then come back here.
            </>
          ) : (
            "Pick a vendor, upload the ACORD PDF, and wait for the review queue."
          )
        }
        help="AI extraction is assistance only — low-confidence fields and FAIL verdicts always go to human review. You remain the final approver."
        live
        liveLabel="Ready"
      />

      <Suspense
        fallback={
          <div
            className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8"
            role="status"
            aria-busy="true"
            aria-label="Loading upload form"
          >
            <div className="bg-card relative overflow-hidden rounded-xl border shadow-xs">
              <div
                className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
                aria-hidden
              />
              <div className="space-y-4 p-4 sm:p-6">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-36 w-full rounded-lg sm:h-44" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        }
      >
        <UploadPage vendors={vendors} />
      </Suspense>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. Nothing auto-publishes.
      </PageSecondary>
    </PageFrame>
  );
}
