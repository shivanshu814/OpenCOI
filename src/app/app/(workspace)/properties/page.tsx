import { EmptyState } from "@/components/empty-state";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import {
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { Building2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AddPropertyForm } from "./add-property-form";

type PropertyRow = {
  id: string;
  name: string;
  certificate_holder_name: string | null;
  city: string | null;
  state: string | null;
};

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

      <ContentSurface className="gap-0 py-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">All properties</CardTitle>
          <CardAction className="text-muted-foreground self-center inline-flex items-center gap-1.5 text-xs tabular-nums">
            <span className="relative flex size-1.5">
              <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
              <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
            </span>
            {properties.length}
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y border-t px-0">
          {!hasData ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                title="No properties yet"
                description="Add your first building above to set its certificate holder and required limits. Owner reports unlock from here."
                actionHref="/app/reports"
                actionLabel="See owner reports"
                liveHint="No sample properties — your list stays empty until you add one."
                icon={<Building2 className="size-5" aria-hidden />}
              />
            </div>
          ) : (
            properties.map((p) => (
              <Link
                key={p.id}
                href={`/app/properties/${p.id}`}
                className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {[
                      p.certificate_holder_name,
                      [p.city, p.state].filter(Boolean).join(", "),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No certificate holder set"}
                  </p>
                </div>
                <ChevronRight
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
              </Link>
            ))
          )}
        </CardContent>
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
