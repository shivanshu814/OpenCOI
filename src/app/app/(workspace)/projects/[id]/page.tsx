import { LiveBadge } from "@/components/live-activity";
import {
  DetailHeader,
  PageFrame,
  PageSecondary,
} from "@/components/page-frame";
import { Button } from "@/components/ui/button";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { RequirementRule } from "@/lib/requirements/engine";
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProjectEditor } from "./project-editor";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // No invented sample jobs.
  if (!isSupabaseConfigured()) notFound();

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

  const dates =
    project.start_date || project.end_date
      ? [project.start_date, project.end_date].filter(Boolean).join(" → ")
      : "Dates TBD";

  return (
    <PageFrame>
      <DetailHeader
        backHref="/app/projects"
        backLabel="Projects"
        title={project.name}
        meta={`${dates} · Status: ${project.status ?? "active"}`}
        badge={<LiveBadge label="Live" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/projects/${project.id}/closeout-pack`} download />
            }
          >
            Closeout pack
          </Button>
        }
      />

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

      <PageSecondary>
        Job-site packs are document-review assistance — not legal, insurance, or
        professional advice. You approve every verdict before it counts.
      </PageSecondary>
    </PageFrame>
  );
}
