import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
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
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Per-property certificate holder, AI wording, and requirement overrides (D1)."
        live
      />

      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <div
          className="from-brand via-brand/70 to-brand/20 h-1 w-full bg-gradient-to-r"
          aria-hidden
        />
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">
            All properties
          </CardTitle>
          <CardAction className="text-muted-foreground self-center inline-flex items-center gap-1.5 text-xs tabular-nums">
            <span className="relative flex size-1.5">
              <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
              <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
            </span>
            {properties.length}
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y border-t px-0">
          {properties.map((p) => (
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
          ))}
          {properties.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              No properties yet — add your first one below to set its
              certificate holder and required limits.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AddPropertyForm />
    </div>
  );
}
