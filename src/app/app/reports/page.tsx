import { DownloadOwnerReportButton } from "@/components/download-owner-report-button";
import { EmptyState } from "@/components/empty-state";
import { SendOwnerReportButton } from "@/components/send-owner-report-button";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type PropertyRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  owner_report_email: string | null;
  owner_report_enabled: boolean;
};

async function listProperties(): Promise<PropertyRow[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "prop_demo_1",
        name: "Oak Street Apartments",
        city: "Austin",
        state: "TX",
        owner_report_email: "owner@oakstreet.example",
        owner_report_enabled: true,
      },
    ];
  }
  const session = await getSessionOrg();
  if (!session) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name, city, state, owner_report_email, owner_report_enabled")
    .eq("org_id", session.orgId)
    .order("name");
  return (data ?? []) as PropertyRow[];
}

export default async function ReportsPage() {
  const properties = await listProperties();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Owner reports (D3) — monthly branded PDF/email with compliance %,
          documents on file, and risks flagged. PMs use these with building
          owners.
        </p>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add a property, assign vendors, then generate an owner report."
          actionHref="/app/properties"
          actionLabel="Go to Properties"
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {properties.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  href={`/app/properties/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-muted-foreground text-xs">
                  {[
                    [p.city, p.state].filter(Boolean).join(", "),
                    p.owner_report_email
                      ? `Owner email: ${p.owner_report_email}`
                      : "No owner email set",
                    p.owner_report_enabled
                      ? "Monthly auto-send on"
                      : "Monthly auto-send off",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DownloadOwnerReportButton propertyId={p.id} />
                <SendOwnerReportButton
                  propertyId={p.id}
                  toHint={p.owner_report_email}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">
        Risks flagged counts vendors that are non-compliant, missing documents,
        or in review — not insurance claim outcomes. Mid-term cancellations are
        mitigated via agent confirmation, not automatic detection.
      </p>
    </div>
  );
}
