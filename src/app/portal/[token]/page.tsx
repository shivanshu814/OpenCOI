import {
  CardLiveAccent,
  LiveCount,
  PortalLiveTicker,
} from "@/components/live-activity";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import { PortalSupportChat } from "@/components/portal-support-chat";
import { VendorStatusBadge } from "@/components/status-badges";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { suggestedQuestions } from "@/lib/ai/support-chat";
import { isClaudeConfigured, isSupabaseConfigured } from "@/lib/config";
import {
  buildSupportContext,
  loadTranscript,
} from "@/lib/portal/support-context";
import { resolvePortalToken } from "@/lib/portal/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import type { CSSProperties } from "react";
import { PortalActions } from "./portal-actions";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <PageHeader
          title="Vendor portal"
          description="Demo mode — connect Supabase to enable magic-link uploads."
          live
          liveLabel="Demo"
        />
      </PageFrame>
    );
  }

  const ctx = await resolvePortalToken(token);
  if (!ctx) {
    return (
      <PageFrame>
        <ContentSurface className="mx-auto max-w-lg py-10 text-center" rail>
          <div className="space-y-3 px-6">
            <CircleAlert
              className="text-muted-foreground mx-auto size-8"
              aria-hidden
            />
            <h1 className="text-lg font-semibold tracking-tight">
              Link expired
            </h1>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed">
              This portal link is invalid or expired. Ask{" "}
              <span className="text-foreground font-medium">
                your property manager
              </span>{" "}
              to resend a chase email.
            </p>
          </div>
        </ContentSurface>
      </PageFrame>
    );
  }

  const locale = ctx.preferredLocale;
  const admin = createAdminClient();
  const [supportCtx, transcript] = await Promise.all([
    buildSupportContext(ctx, admin),
    loadTranscript(admin, ctx.orgId, ctx.vendorId),
  ]);
  const gaps = supportCtx.gaps.map((g) => `${g.label}: ${g.reason}`);

  const title =
    locale === "es"
      ? `Estado de cumplimiento — ${ctx.orgName}`
      : `Compliance status — ${ctx.orgName}`;
  const intro =
    locale === "es"
      ? `Hola ${ctx.vendorName}. Sin contraseña: suba su COI o reenvíe a su agente.`
      : `Hi ${ctx.vendorName}. No login needed — upload your COI or forward to your agent.`;

  // Same white-label pattern as AppShell: retint brand tokens, never paint
  // the heading a raw hex (that was reading as purple on some org colors).
  const themeStyle = ctx.brandColor
    ? ({
        "--brand": ctx.brandColor,
        "--brand-muted": `color-mix(in oklab, ${ctx.brandColor} 14%, var(--background))`,
        "--primary": ctx.brandColor,
        "--ring": ctx.brandColor,
      } as CSSProperties)
    : undefined;

  return (
    <div style={themeStyle}>
      <PageFrame>
        {ctx.logoUrl ? (
          <div className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ctx.logoUrl}
              alt={`${ctx.orgName} logo`}
              className="h-9 w-auto max-w-[200px] object-contain"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium tracking-tight">
                {ctx.orgName}
              </p>
              <p className="text-muted-foreground text-xs">
                {locale === "es" ? "Portal de proveedores" : "Vendor portal"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader
            title={title}
            description={intro}
            audience={
              locale === "es"
                ? "Proveedores · sin contraseña"
                : "Vendors · no login"
            }
            nextStep={
              locale === "es"
                ? "Revise lo que falta, pregunte si no entiende, luego suba el PDF."
                : "Review what’s missing, ask if unclear, then upload the PDF."
            }
            help={
              locale === "es"
                ? "Asistencia para revisión de documentos — no es asesoría legal, de seguros ni profesional. Su administrador toma la decisión final."
                : "Document review assistance — not legal, insurance, or professional advice. Your property manager makes the final decision."
            }
            live
            liveLabel="Live"
            actions={<VendorStatusBadge status={ctx.vendorStatus as never} />}
          />
          <PortalLiveTicker locale={locale} />
        </div>

        <StatStrip
          className="lg:max-w-none"
          items={[
            {
              label: locale === "es" ? "Estado" : "Status",
              value: (
                <span className="text-base font-semibold tracking-tight">
                  {statusLabel(ctx.vendorStatus, locale)}
                </span>
              ),
              tone: statusTone(ctx.vendorStatus),
              hint:
                locale === "es"
                  ? "Actualizado en vivo"
                  : "Updates automatically",
            },
            {
              label: locale === "es" ? "Hallazgos" : "Open gaps",
              value: gaps.length,
              tone: gaps.length > 0 ? "warn" : "ok",
              hint:
                gaps.length > 0
                  ? locale === "es"
                    ? "Publicados por su administrador"
                    : "Published by your property manager"
                  : locale === "es"
                    ? "Nada publicado, o está al día"
                    : "Nothing published — or you’re up to date",
            },
            {
              label: locale === "es" ? "Siguiente paso" : "Next step",
              value: (
                <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
                  <Upload className="text-brand size-4" aria-hidden />
                  {locale === "es" ? "Subir COI" : "Upload COI"}
                </span>
              ),
              tone: "brand",
              hint:
                locale === "es"
                  ? "PDF ACORD 25, máx. 20 MB"
                  : "ACORD 25 PDF, max 20 MB",
            },
          ]}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
          <div className="min-w-0 space-y-6">
            {gaps.length > 0 ? (
              <Card className="gap-0 overflow-hidden py-0">
                <CardLiveAccent />
                <CardHeader className="border-b py-3 [.border-b]:pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {locale === "es" ? "Lo que falta" : "What’s missing"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {locale === "es"
                      ? "Hallazgos publicados — corrija estos antes de reenviar."
                      : "Published findings — fix these before you resubmit."}
                  </CardDescription>
                  <CardAction className="self-center">
                    <LiveCount value={gaps.length} />
                  </CardAction>
                </CardHeader>
                <ul className="divide-y">
                  {gaps.map((g) => {
                    const sep = g.indexOf(": ");
                    const label = sep > 0 ? g.slice(0, sep) : g;
                    const reason = sep > 0 ? g.slice(sep + 2) : null;
                    return (
                      <li
                        key={g}
                        className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3 transition-colors"
                      >
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
              </Card>
            ) : (
              <Alert className="bg-card px-4 py-4 shadow-xs">
                <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
                <AlertTitle className="font-normal leading-relaxed">
                  {locale === "es"
                    ? "No hay hallazgos publicados todavía, o está al día."
                    : "No published gaps yet — or you’re up to date."}
                </AlertTitle>
              </Alert>
            )}

            <PortalSupportChat
              token={token}
              locale={locale}
              initialTurns={transcript}
              suggestions={suggestedQuestions(supportCtx)}
              enabled={isClaudeConfigured()}
            />
          </div>

          <div className="min-w-0 lg:sticky lg:top-24">
            <PortalActions
              token={token}
              locale={locale}
              agentEmail={ctx.agentEmail}
            />
          </div>
        </div>

        <PageSecondary>
          {locale === "es"
            ? "Asistencia para revisión de documentos — no es asesoría legal, de seguros ni profesional. Su administrador toma la decisión final."
            : "Document review assistance — not legal, insurance, or professional advice. Your property manager makes the final decision."}
        </PageSecondary>
      </PageFrame>
    </div>
  );
}

function statusLabel(status: string, locale: "en" | "es"): string {
  const map: Record<string, { en: string; es: string }> = {
    compliant: { en: "Compliant", es: "Cumple" },
    expiring: { en: "Expiring", es: "Por vencer" },
    non_compliant: { en: "Non-compliant", es: "No cumple" },
    missing_docs: { en: "Missing docs", es: "Faltan docs" },
    in_review: { en: "In review", es: "En revisión" },
  };
  return map[status]?.[locale] ?? status.replaceAll("_", " ");
}

function statusTone(
  status: string,
): "default" | "ok" | "warn" | "danger" | "brand" {
  switch (status) {
    case "compliant":
      return "ok";
    case "expiring":
    case "missing_docs":
    case "in_review":
      return "warn";
    case "non_compliant":
      return "danger";
    default:
      return "default";
  }
}
