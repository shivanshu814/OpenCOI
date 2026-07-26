import { EmptyState } from "@/components/empty-state";
import {
  ListLiveCount,
  ListTableHead,
  ListTableRow,
} from "@/components/list-table";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { AddPropertyForm } from "./add-property-form";

type PropertyRow = {
  id: string;
  name: string;
  certificate_holder_name: string | null;
  city: string | null;
  state: string | null;
};

const ROW_GRID =
  "lg:grid-cols-[minmax(12rem,1.2fr)_minmax(12rem,1.4fr)_minmax(8rem,0.8fr)_6.5rem_auto]";

async function listProperties(): Promise<PropertyRow[]> {
  // Honest empty — never invent sample buildings.
  if (!isSupabaseConfigured()) return [];
  const session = await getSessionOrg();
  if (!session) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name, certificate_holder_name, city, state")
    .eq("org_id", session.orgId)
    .order("name");
  return (data ?? []) as PropertyRow[];
}

export default async function PropertiesPage() {
  const properties = await listProperties();
  const hasData = properties.length > 0;
  const missingHolder = properties.filter(
    (p) => !p.certificate_holder_name?.trim(),
  ).length;

  return (
    <PageFrame>
      <PageHeader
        title="Properties"
        description="Set certificate-holder wording and coverage rules per building so COIs match each site."
        audience="Property managers with one or more sites"
        nextStep={
          !hasData
            ? "Add a property below and set its certificate-holder name."
            : missingHolder > 0
              ? "Open properties missing a certificate holder and finish their rules."
              : "Open a property to tune limits, AI wording, or owner-report email."
        }
        help="When a COI is checked, CertShield compares the extracted holder and limits to this property's rules. Uncertainty goes to review — never a silent pass."
        live
      />

      {hasData ? (
        <StatStrip
          items={[
            {
              label: "Properties",
              value: properties.length,
              tone: "brand",
            },
            {
              label: "Holder set",
              value: properties.length - missingHolder,
              tone: "ok",
            },
            {
              label: "Needs holder",
              value: missingHolder,
              tone: missingHolder > 0 ? "warn" : "ok",
              hint:
                missingHolder > 0
                  ? "COI checks need a certificate-holder name"
                  : undefined,
            },
          ]}
        />
      ) : null}

      {!hasData ? <AddPropertyForm /> : null}

      <ContentSurface>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              All properties
            </h2>
            {hasData ? (
              <ListLiveCount>{properties.length}</ListLiveCount>
            ) : null}
          </div>
        </div>

        {!hasData ? (
          <EmptyState
            title="No properties yet"
            description="Add your first building above to set its certificate holder and required limits. Owner reports unlock from here."
            actionHref="/app/reports"
            actionLabel="See owner reports"
            liveHint="No sample properties — your list stays empty until you add one."
            icon={<Building2 className="size-5" aria-hidden />}
          />
        ) : (
          <>
            <ListTableHead
              gridClassName={ROW_GRID}
              columns={[
                "Property",
                "Certificate holder",
                "Location",
                "Holder",
                { label: "Open", className: "text-right", srOnly: true },
              ]}
            />
            <div className="divide-y">
              {properties.map((p) => {
                const location = [p.city, p.state].filter(Boolean).join(", ");
                const hasHolder = Boolean(p.certificate_holder_name?.trim());
                return (
                  <ListTableRow key={p.id} gridClassName={ROW_GRID}>
                    <Link
                      href={`/app/properties/${p.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex-none"
                    >
                      <span className="bg-muted text-muted-foreground group-hover:bg-brand-muted group-hover:text-brand flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
                        <Building2 className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium underline-offset-4 group-hover:underline">
                          {p.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs lg:hidden">
                          {p.certificate_holder_name || "No holder set"}
                          {location ? ` · ${location}` : ""}
                        </p>
                      </div>
                    </Link>

                    <div className="text-muted-foreground hidden min-w-0 truncate text-sm lg:block">
                      {p.certificate_holder_name || "—"}
                    </div>

                    <div className="text-muted-foreground hidden min-w-0 items-center gap-1.5 truncate text-sm lg:flex">
                      {location ? (
                        <>
                          <MapPin className="size-3.5 shrink-0 opacity-70" aria-hidden />
                          <span className="truncate">{location}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${
                          hasHolder
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                            : "bg-amber-50 text-amber-800 ring-amber-600/15"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            hasHolder ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                        {hasHolder ? "Set" : "Needed"}
                      </span>
                    </div>

                    <div className="ml-auto flex items-center justify-end lg:ml-0">
                      <Link
                        href={`/app/properties/${p.id}`}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
                        aria-label={`Open ${p.name}`}
                      >
                        Open
                        <ChevronRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </ListTableRow>
                );
              })}
            </div>
          </>
        )}
      </ContentSurface>

      {hasData ? <AddPropertyForm /> : null}

      <PageSecondary>
        Uncertainty on holder match always routes to review — never a silent
        pass. Document review assistance — not legal, insurance, or professional
        advice.
      </PageSecondary>
    </PageFrame>
  );
}
