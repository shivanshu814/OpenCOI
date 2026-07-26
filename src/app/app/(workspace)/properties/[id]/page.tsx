import { DownloadOwnerReportButton } from "@/components/download-owner-report-button";
import { LiveBadge } from "@/components/live-activity";
import {
  DetailHeader,
  PageFrame,
  PageSecondary,
} from "@/components/page-frame";
import { SendOwnerReportButton } from "@/components/send-owner-report-button";
import { Button } from "@/components/ui/button";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PropertyEditor } from "./property-editor";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // No invented sample buildings.
  if (!isSupabaseConfigured()) notFound();

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
  const location = [property.city, property.state].filter(Boolean).join(", ");

  return (
    <PageFrame>
      <DetailHeader
        backHref="/app/properties"
        backLabel="Properties"
        title={property.name}
        meta={[
          property.certificate_holder_name
            ? `Holder: ${property.certificate_holder_name}`
            : "Certificate holder not set",
          location || null,
        ]
          .filter(Boolean)
          .join(" · ")}
        badge={<LiveBadge label="Live" />}
        actions={
          <>
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
          </>
        }
      />

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

      <PageSecondary>
        Holder and AI-wording checks route uncertainty to review — never a
        silent pass. Document review assistance — not legal, insurance, or
        professional advice.
      </PageSecondary>
    </PageFrame>
  );
}
