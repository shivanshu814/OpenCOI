import { IntakeEmailCard } from "@/components/intake-email-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionOrg } from "@/lib/auth/session";
import { listVendors } from "@/lib/data/documents";
import { DEMO_INTAKE_EMAIL } from "@/lib/email/intake-address";
import { Suspense } from "react";
import UploadPage from "./upload-client";

export default async function Page() {
  const [vendors, session] = await Promise.all([
    listVendors(),
    getSessionOrg(),
  ]);
  const intakeEmail = session?.intakeEmail ?? DEMO_INTAKE_EMAIL;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload COI</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Web upload path (email-in lands Week 2). Endorsement checks run on
          every extract.
        </p>
      </div>

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

      <IntakeEmailCard email={intakeEmail} demo={!session?.intakeEmail} />
    </div>
  );
}
