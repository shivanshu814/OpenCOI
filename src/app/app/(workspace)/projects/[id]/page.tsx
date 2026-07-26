import { LiveBadge } from "@/components/live-activity";
import { Button } from "@/components/ui/button";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectEditor } from "./project-editor";

function BackLink() {
  return (
    <Link
      href="/app/projects"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Projects
    </Link>
  );
}

function ProjectHeading({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight">{name}</h1>
        <LiveBadge label="Live" />
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <BackLink />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <ProjectHeading
              name="Roof Replace — Building A"
              description="Job-specific requirements merge over global / trade / property rules."
            />
            <Button
              variant="outline"
              size="sm"
              render={<a href={`/api/projects/${id}/closeout-pack`} download />}
            >
              Closeout pack
            </Button>
          </div>
        </div>
        <ProjectEditor
          projectId={id}
          initial={{
            name: "Roof Replace — Building A",
            start_date: "2026-07-01",
            end_date: "2026-09-30",
            status: "active",
            certificate_holder_name: "Oak Street LLC",
            additional_insured_wording: "",
            notes: "",
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
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("org_id", session.orgId)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: reqSet }, { data: links }, { data: vendors }] =
    await Promise.all([
      supabase
        .from("requirement_sets")
        .select("rules")
        .eq("org_id", session.orgId)
        .eq("scope", "project")
        .eq("project_id", id)
        .maybeSingle(),
      supabase
        .from("project_vendors")
        .select("vendor_id")
        .eq("project_id", id)
        .eq("org_id", session.orgId),
      supabase
        .from("vendors")
        .select("id, name")
        .eq("org_id", session.orgId)
        .order("name"),
    ]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <BackLink />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <ProjectHeading
            name={project.name}
            description="Job-specific requirements merge over global / trade / property rules."
          />
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/projects/${project.id}/closeout-pack`} download />
            }
          >
            Closeout pack
          </Button>
        </div>
      </div>
      <ProjectEditor
        projectId={id}
        initial={{
          name: project.name ?? "",
          start_date: (project.start_date as string) ?? "",
          end_date: (project.end_date as string) ?? "",
          status: (project.status as ProjectStatus) ?? "active",
          certificate_holder_name: project.certificate_holder_name ?? "",
          additional_insured_wording:
            project.additional_insured_wording ?? "",
          notes: project.notes ?? "",
        }}
        rules={(reqSet?.rules as RequirementRule[]) ?? []}
        vendorIds={(links ?? []).map((l) => l.vendor_id)}
        vendors={(vendors ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
