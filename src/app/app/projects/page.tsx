import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AddProjectForm } from "./add-project-form";

type ProjectRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
};

const STATUS_META: Record<ProjectStatus, { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-emerald-500" },
  closeout: { label: "Closeout", dot: "bg-amber-400" },
  closed: { label: "Closed", dot: "bg-slate-400" },
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

      <Card className="min-w-0 gap-0 py-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">All projects</CardTitle>
          <CardAction className="text-muted-foreground self-center text-xs tabular-nums">
            {projects.length}
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y border-t px-0">
          {projects.map((p) => {
            const meta = STATUS_META[p.status] ?? STATUS_META.active;
            return (
              <Link
                key={p.id}
                href={`/app/projects/${p.id}`}
                className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-muted-foreground truncate text-xs tabular-nums">
                    {p.start_date && p.end_date
                      ? `${p.start_date} → ${p.end_date}`
                      : p.start_date || p.end_date || "Dates TBD"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`size-2 rounded-full ${meta.dot}`}
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{meta.label}</span>
                  </span>
                  <ChevronRight
                    className="text-muted-foreground size-4"
                    aria-hidden
                  />
                </div>
              </Link>
            );
          })}
          {projects.length === 0 ? (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              No projects yet — create one below, assign subcontractors, and
              raise limits for the job.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <AddProjectForm />
    </div>
  );
}
