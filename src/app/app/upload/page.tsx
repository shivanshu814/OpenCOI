import { IntakeEmailCard } from "@/components/intake-email-card";
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
          <p className="text-muted-foreground text-sm">Loading upload…</p>
        }
      >
        <UploadPage vendors={vendors} />
      </Suspense>

      <IntakeEmailCard email={intakeEmail} demo={!session?.intakeEmail} />
    </div>
  );
}
