import { EmptyState } from "@/components/empty-state";
import {
  ListLiveCount,
  ListTableHead,
  ListTableRow,
} from "@/components/list-table";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
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

const STATUS_META: Record<
  ProjectStatus,
  { label: string; dot: string; next: string }
> = {
  active: {
    label: "Active",
    dot: "bg-emerald-500",
    next: "Assign subs or raise job limits",
  },
  closeout: {
    label: "Closeout",
    dot: "bg-amber-400",
    next: "Export the closeout pack",
  },
  closed: {
    label: "Closed",
    dot: "bg-slate-400",
    next: "Archive — pack available to re-download",
  },
};

const ROW_GRID =
  "lg:grid-cols-[minmax(12rem,1.2fr)_minmax(10rem,0.9fr)_minmax(12rem,1.2fr)_8rem_auto]";

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

      <ContentSurface>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight">
              All projects
            </h2>
            <ListLiveCount>{projects.length}</ListLiveCount>
          </div>
        </div>

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
          <>
            <ListTableHead
              gridClassName={ROW_GRID}
              columns={[
                "Project",
                "Dates",
                "Next",
                "Status",
                { label: "Open", className: "text-right", srOnly: true },
              ]}
            />
            <div className="divide-y">
              {projects.map((p) => {
                const meta = STATUS_META[p.status] ?? STATUS_META.active;
                return (
                  <ListTableRow key={p.id} gridClassName={ROW_GRID}>
                    <Link
                      href={`/app/projects/${p.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex-none"
                    >
                      <span className="bg-muted text-muted-foreground group-hover:bg-brand-muted group-hover:text-brand flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
                        <FolderKanban className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium underline-offset-4 group-hover:underline">
                          {p.name}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1 truncate text-xs tabular-nums lg:hidden">
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
                    </Link>

                    <div className="text-muted-foreground hidden items-center gap-1 truncate text-sm tabular-nums lg:flex">
                      {p.start_date && p.end_date ? (
                        <>
                          {p.start_date}
                          <ArrowRight
                            className="size-3.5 shrink-0 opacity-60"
                            strokeWidth={2.25}
                            aria-hidden
                          />
                          {p.end_date}
                        </>
                      ) : (
                        p.start_date || p.end_date || "Dates TBD"
                      )}
                    </div>

                    <div className="text-muted-foreground hidden min-w-0 truncate text-xs leading-snug lg:block">
                      {meta.next}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`size-2 rounded-full ${meta.dot}`}
                        aria-hidden
                      />
                      <span className="text-muted-foreground">{meta.label}</span>
                    </div>

                    <div className="ml-auto flex items-center justify-end lg:ml-0">
                      <Link
                        href={`/app/projects/${p.id}`}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
                        aria-label={`Open ${p.name}`}
                      >
                        Open
                        <ChevronRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </ListTableRow>
                );
              })}
            </div>
          </>
        )}
      </ContentSurface>

      {hasData ? <AddProjectForm /> : null}

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. You approve every verdict before it counts on a job.
      </PageSecondary>
    </PageFrame>
  );
}
