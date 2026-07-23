import { VendorStatusBadge } from "@/components/status-badges";
import { isSupabaseConfigured } from "@/lib/config";
import { resolvePortalToken } from "@/lib/portal/tokens";
import type { Verdict } from "@/lib/requirements/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { PortalActions } from "./portal-actions";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Vendor portal</h1>
        <p className="text-muted-foreground text-sm">
          Demo mode — connect Supabase to enable magic-link uploads.
        </p>
      </div>
    );
  }

  const ctx = await resolvePortalToken(token);
  if (!ctx) {
    return (
      <div className="bg-card space-y-3 rounded-xl border px-5 py-8 text-center">
        <CircleAlert
          className="text-muted-foreground mx-auto size-8"
          aria-hidden
        />
        <h1 className="text-xl font-semibold tracking-tight">Link expired</h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
          This portal link is invalid or expired. Ask{" "}
          <span className="text-foreground font-medium">
            your property manager
          </span>{" "}
          to resend a chase email.
        </p>
      </div>
    );
  }

  const locale = ctx.preferredLocale;
  const gaps = await loadGaps(ctx.orgId, ctx.vendorId);

  const title =
    locale === "es"
      ? `Estado de cumplimiento — ${ctx.orgName}`
      : `Compliance status — ${ctx.orgName}`;
  const intro =
    locale === "es"
      ? `Hola ${ctx.vendorName}. Sin contraseña: suba su COI o reenvíe a su agente.`
      : `Hi ${ctx.vendorName}. No login needed — upload your COI or forward to your agent.`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          {intro}
        </p>
        <div className="mt-3">
          <VendorStatusBadge status={ctx.vendorStatus as never} />
        </div>
      </div>

      {gaps.length > 0 ? (
        <section className="bg-card rounded-xl border">
          <div className="border-b px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">
                {locale === "es" ? "Lo que falta" : "What’s missing"}
              </h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {gaps.length}
              </span>
            </div>
          </div>
          <ul className="divide-y">
            {gaps.map((g) => {
              const sep = g.indexOf(": ");
              const label = sep > 0 ? g.slice(0, sep) : g;
              const reason = sep > 0 ? g.slice(sep + 2) : null;
              return (
                <li key={g} className="flex items-start gap-3 px-4 py-3">
                  <CircleAlert
                    className="mt-0.5 size-4 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    {reason ? (
                      <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                        {reason}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <div className="bg-card flex items-start gap-3 rounded-xl border px-4 py-4">
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-emerald-600"
            aria-hidden
          />
          <p className="text-sm leading-relaxed">
            {locale === "es"
              ? "No hay hallazgos publicados todavía, o está al día."
              : "No published gaps yet — or you’re up to date."}
          </p>
        </div>
      )}

      <PortalActions
        token={token}
        locale={locale}
        agentEmail={ctx.agentEmail}
      />
    </div>
  );
}

async function loadGaps(orgId: string, vendorId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: check } = await admin
    .from("compliance_checks")
    .select("lines, overall_verdict, published_at")
    .eq("org_id", orgId)
    .eq("vendor_id", vendorId)
    .not("published_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!check?.lines || !Array.isArray(check.lines)) return [];

  return (check.lines as { label: string; verdict: Verdict; reason: string }[])
    .filter((l) => l.verdict !== "PASS")
    .map((l) => `${l.label}: ${l.reason}`);
}
