import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
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
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "prop_demo_1",
        name: "Oak Street Apartments",
        certificate_holder_name: "Oak Street LLC",
        city: "Austin",
        state: "TX",
      },
    ];
  }
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Per-property certificate holder, AI wording, and requirement overrides
          (D1).
        </p>
      </div>

      <AddPropertyForm />

      <ul className="divide-y rounded-lg border">
        {properties.map((p) => (
          <li key={p.id}>
            <Link
              href={`/app/properties/${p.id}`}
              className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs">
                  {[
                    p.certificate_holder_name,
                    [p.city, p.state].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No holder set"}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">Edit →</span>
            </Link>
          </li>
        ))}
        {properties.length === 0 ? (
          <li className="text-muted-foreground px-4 py-8 text-center text-sm">
            No properties yet.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
