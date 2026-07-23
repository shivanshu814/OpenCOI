import { VendorStatusBadge } from "@/components/status-badges";
import { isSupabaseConfigured } from "@/lib/config";
import { resolvePortalToken } from "@/lib/portal/tokens";
import type { Verdict } from "@/lib/requirements/engine";
import { createAdminClient } from "@/lib/supabase/admin";
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
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Link expired</h1>
        <p className="text-muted-foreground text-sm">
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{intro}</p>
        <div className="mt-3">
          <VendorStatusBadge status={ctx.vendorStatus as never} />
        </div>
      </div>

      {gaps.length > 0 ? (
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">
            {locale === "es" ? "Lo que falta" : "What’s missing"}
          </h2>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {locale === "es"
            ? "No hay hallazgos publicados todavía, o está al día."
            : "No published gaps yet — or you’re up to date."}
        </p>
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
