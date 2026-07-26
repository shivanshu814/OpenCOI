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
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, ChevronRight, FolderKanban } from "lucide-react";
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
  // Honest empty — never invent sample jobs.
  if (!isSupabaseConfigured()) return [];
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
  const hasData = projects.length > 0;
  const active = projects.filter((p) => p.status === "active").length;
  const closeout = projects.filter((p) => p.status === "closeout").length;

  return (
    <PageFrame>
      <PageHeader
        title="Projects"
        description="Track subcontractors and job-specific insurance limits, then export a closeout pack."
        audience="General contractors"
        nextStep={
          !hasData
            ? "Create a project below and attach the subs working that job."
            : "Open a project to raise limits, assign subs, or download the closeout pack."
        }
        help="Project mode is for job-site compliance packs — not a substitute for legal review. You approve every verdict before it counts."
        live
      />

      {hasData ? (
        <StatStrip
          items={[
            { label: "Projects", value: projects.length, tone: "brand" },
            { label: "Active", value: active, tone: "ok" },
            {
              label: "In closeout",
              value: closeout,
              tone: closeout > 0 ? "warn" : "default",
            },
          ]}
        />
      ) : null}

      {!hasData ? <AddProjectForm /> : null}

      <ContentSurface className="gap-0 py-0">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-semibold">All projects</CardTitle>
          <CardAction className="text-muted-foreground self-center inline-flex items-center gap-1.5 text-xs tabular-nums">
            <span className="relative flex size-1.5">
              <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
              <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
            </span>
            {projects.length}
          </CardAction>
        </CardHeader>
        <CardContent className="divide-y border-t px-0">
          {!hasData ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                title="No projects yet"
                description="Create a job above, assign subcontractors, and raise limits for the site. Closeout packs export when you're ready."
                liveHint="No sample projects — your list stays empty until you create one."
                icon={<FolderKanban className="size-5" aria-hidden />}
              />
            </div>
          ) : (
            projects.map((p) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.active;
              return (
                <Link
                  key={p.id}
                  href={`/app/projects/${p.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1 truncate text-xs tabular-nums">
                      {p.start_date && p.end_date ? (
                        <>
                          {p.start_date}
                          <ArrowRight
                            className="size-3 shrink-0 opacity-60"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          {p.end_date}
                        </>
                      ) : (
                        p.start_date || p.end_date || "Dates TBD"
                      )}
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
            })
          )}
        </CardContent>
      </ContentSurface>

      {hasData ? <AddProjectForm /> : null}

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. You approve every verdict before it counts on a job.
      </PageSecondary>
    </PageFrame>
  );
}
