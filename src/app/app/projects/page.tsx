import { EmptyState } from "@/components/empty-state";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AddProjectForm } from "./add-project-form";

type ProjectRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
};

async function listProjects(): Promise<ProjectRow[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "proj_demo_1",
        name: "Roof Replace — Building A",
        start_date: "2026-07-01",
        end_date: "2026-09-30",
        status: "active",
      },
    ];
  }
  const session = await getSessionOrg();
  if (!session) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, start_date, end_date, status")
    .eq("org_id", session.orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ProjectRow[];
}

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          GC project mode (D2) — attach subs, set job-specific limits, export a
          closeout compliance pack.
        </p>
      </div>

      <AddProjectForm />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project, assign subcontractors, and raise limits for the job."
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/projects/${p.id}`}
                className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {[
                      p.start_date && p.end_date
                        ? `${p.start_date} → ${p.end_date}`
                        : p.start_date || p.end_date || "Dates TBD",
                      p.status,
                    ].join(" · ")}
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
