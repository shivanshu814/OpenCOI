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
          description="Add a property, assign vendors, then generate an owner report — compliance %, documents on file, and risks flagged, ready for the building owner."
          actionHref="/app/properties"
          actionLabel="Go to Properties"
        />
      ) : (
        <section className="bg-card rounded-xl border">
          <div className="border-b px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Properties</h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {properties.length}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Download an owner report anytime, or email it directly to the
              owner on file.
            </p>
          </div>
          <ul className="divide-y">
            {properties.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/properties/${p.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                    {[p.city, p.state].filter(Boolean).length > 0 ? (
                      <span>{[p.city, p.state].filter(Boolean).join(", ")}</span>
                    ) : null}
                    <span>
                      {p.owner_report_email
                        ? `Owner email: ${p.owner_report_email}`
                        : "No owner email set"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`size-1.5 rounded-full ${
                          p.owner_report_enabled
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {p.owner_report_enabled
                        ? "Monthly auto-send on"
                        : "Monthly auto-send off"}
                    </span>
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
        </section>
      )}

      <p className="text-muted-foreground text-xs">
        Risks flagged counts vendors that are non-compliant, missing documents,
        or in review — not insurance claim outcomes. Mid-term cancellations are
        mitigated via agent confirmation, not automatic detection.
      </p>
    </div>
  );
}
