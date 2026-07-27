import { isSupabaseConfigured } from "@/lib/config";
import { pickChaseTemplate } from "@/lib/chase/cadence";
import {
  renderDemoChase,
  sendChaseForVendor,
} from "@/lib/chase/send";
import type { ChaseLocale, ChaseTemplateKey } from "@/lib/chase/types";
import { getSessionOrg } from "@/lib/auth/session";
import { canWriteOrgData } from "@/lib/auth/roles";
import { DEMO_VENDORS } from "@/lib/demo/store";
import { inngest } from "@/inngest/client";
import { isInngestConfigured } from "@/lib/config";
import {
  chaseSendSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = chaseSendSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(validationErrorBody(parsed.error, "Invalid body"), {
      status: 400,
    });
  }

  const { vendorId, templateKey, locale, previewOnly, async: useAsync } =
    parsed.data;

  if (!isSupabaseConfigured()) {
    const vendor = DEMO_VENDORS.find((v) => v.id === vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    const key =
      templateKey ??
      pickChaseTemplate({
        reason: vendor.status === "missing_docs" ? "missing_docs" : "expiry",
        earliestExpirationDate: "2026-08-15",
        lastTemplateKey: null,
        lastSentAt: null,
        attempts: 0,
      }) ??
      "doc_request";
    const result = renderDemoChase({
      templateKey: key as ChaseTemplateKey,
      locale: (locale ?? "en") as ChaseLocale,
      vendorName: vendor.name,
    });
    // Honest: nothing was emailed. Client must not toast "Sent".
    return NextResponse.json(
      {
        ok: false,
        demo: true,
        rendered: result.rendered,
        error:
          "Chase not sent — connect Supabase and configure SMTP or Resend.",
        note: "Demo mode — set SMTP_* or RESEND_API_KEY + Supabase to send live.",
      },
      { status: 503 },
    );
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json(
      { error: "Read-only role cannot send chase emails" },
      { status: 403 },
    );
  }

  if (useAsync && isInngestConfigured() && !previewOnly) {
    await inngest.send({
      name: "chase/send",
      data: {
        orgId: session.orgId,
        vendorId,
        templateKey,
        locale,
      },
    });
    return NextResponse.json({ ok: true, queued: true });
  }

  const result = await sendChaseForVendor({
    orgId: session.orgId,
    vendorId,
    templateKey: templateKey as ChaseTemplateKey | undefined,
    locale: locale as ChaseLocale | undefined,
    previewOnly,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
