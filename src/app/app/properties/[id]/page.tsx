import { Button } from "@/components/ui/button";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyEditor } from "./property-editor";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <Link href="/app/properties" className="text-muted-foreground text-sm">
          ← Properties
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Oak Street Apartments
        </h1>
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
    <div className="space-y-6">
      <Link href="/app/properties" className="text-muted-foreground text-sm">
        ← Properties
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Certificate holder + AI wording + overrides merge over global/trade
            rules.
          </p>
        </div>
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
        }}
        rules={(reqSet?.rules as RequirementRule[]) ?? []}
        vendorIds={(links ?? []).map((l) => l.vendor_id)}
        vendors={(vendors ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
