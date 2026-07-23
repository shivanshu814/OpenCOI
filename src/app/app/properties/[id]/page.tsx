import { DownloadOwnerReportButton } from "@/components/download-owner-report-button";
import { SendOwnerReportButton } from "@/components/send-owner-report-button";
import { Button } from "@/components/ui/button";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyEditor } from "./property-editor";

function BackLink() {
  return (
    <Link
      href="/app/properties"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Properties
    </Link>
  );
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <BackLink />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Oak Street Apartments
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Certificate holder + AI wording + overrides merge over
                global/trade rules.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DownloadOwnerReportButton propertyId={id} />
              <SendOwnerReportButton
                propertyId={id}
                toHint="owner@oakstreet.example"
              />
            </div>
          </div>
        </div>
        <PropertyEditor
          propertyId={id}
          initial={{
            name: "Oak Street Apartments",
            address_line: "100 Oak St",
            city: "Austin",
            state: "TX",
            postal_code: "78701",
            certificate_holder_name: "Oak Street LLC",
            additional_insured_wording: "",
            owner_llc_names: "Oak Street LLC",
            lender_names: "",
            owner_report_email: "owner@oakstreet.example",
            owner_report_enabled: true,
          }}
          rules={[]}
          vendorIds={[]}
          vendors={[]}
        />
      </div>
    );
  }

  const session = await getSessionOrg();
  if (!session) notFound();

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!property) notFound();

  const [{ data: reqSet }, { data: links }, { data: vendors }] =
    await Promise.all([
      supabase
        .from("requirement_sets")
        .select("rules")
        .eq("org_id", session.orgId)
        .eq("scope", "property")
        .eq("property_id", id)
        .maybeSingle(),
      supabase
        .from("property_vendors")
        .select("vendor_id")
        .eq("property_id", id)
        .eq("org_id", session.orgId),
      supabase
        .from("vendors")
        .select("id, name")
        .eq("org_id", session.orgId)
        .order("name"),
    ]);

  const ownerLlcs = Array.isArray(property.owner_llc_names)
    ? (property.owner_llc_names as string[])
    : [];
  const lenders = Array.isArray(property.lender_names)
    ? (property.lender_names as string[])
    : [];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <BackLink />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {property.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Certificate holder + AI wording + overrides merge over
              global/trade rules.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadOwnerReportButton propertyId={property.id} />
            <SendOwnerReportButton
              propertyId={property.id}
              toHint={property.owner_report_email as string | null}
            />
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={`/api/properties/${property.id}/audit-pack`} download />
              }
            >
              Audit pack
            </Button>
          </div>
        </div>
      </div>
      <PropertyEditor
        propertyId={id}
        initial={{
          name: property.name ?? "",
          address_line: property.address_line ?? "",
          city: property.city ?? "",
          state: property.state ?? "",
          postal_code: property.postal_code ?? "",
          certificate_holder_name: property.certificate_holder_name ?? "",
          additional_insured_wording: property.additional_insured_wording ?? "",
          owner_llc_names: ownerLlcs.join(", "),
          lender_names: lenders.join(", "),
          owner_report_email: (property.owner_report_email as string) ?? "",
          owner_report_enabled: Boolean(property.owner_report_enabled),
        }}
        rules={(reqSet?.rules as RequirementRule[]) ?? []}
        vendorIds={(links ?? []).map((l) => l.vendor_id)}
        vendors={(vendors ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
