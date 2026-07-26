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

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. Nothing auto-publishes.
      </PageSecondary>
    </PageFrame>
  );
}
