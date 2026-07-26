import { IntakeEmailCard } from "@/components/intake-email-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionOrg } from "@/lib/auth/session";
import { isEmailInboundConfigured } from "@/lib/config";
import { listVendors } from "@/lib/data/documents";
import { Suspense } from "react";
import UploadPage from "./upload-client";

export default async function Page() {
  const [vendors, session] = await Promise.all([
    listVendors(),
    getSessionOrg(),
  ]);
  const inboundLive = isEmailInboundConfigured();
  const intakeEmail =
    inboundLive && session?.intakeEmail ? session.intakeEmail : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload COI"
        description="Drop a vendor COI PDF here. Email-forward intake lights up once Postmark is connected."
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

      <IntakeEmailCard email={intakeEmail} inboundLive={inboundLive} />
    </div>
  );
}
