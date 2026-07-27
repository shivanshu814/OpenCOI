import {
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { RoleGate } from "@/components/role-gate";
import { BrandLoader } from "@/components/ui/loader";
import { listVendors } from "@/lib/data/documents";
import Link from "next/link";
import { Suspense } from "react";
import UploadPage from "./upload-client";

export default async function Page() {
  const vendors = await listVendors();

  return (
    <PageFrame>
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
        fallback={<BrandLoader label="Preparing upload…" className="min-h-[40svh]" />}
      >
        <RoleGate
          require="write"
          fallback={
            <div className="bg-card rounded-xl border p-6 text-sm leading-relaxed shadow-xs">
              <p className="font-medium">Read-only role</p>
              <p className="text-muted-foreground mt-1">
                Your role can view vendors, documents, and reports, but cannot
                upload certificates. Ask a workspace admin to change your role
                if you need to upload.
              </p>
            </div>
          }
        >
          <UploadPage vendors={vendors} />
        </RoleGate>
      </Suspense>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. Nothing auto-publishes.
      </PageSecondary>
    </PageFrame>
  );
}
