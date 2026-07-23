import { isSupabaseConfigured } from "@/lib/config";
import { pickChaseTemplate } from "@/lib/chase/cadence";
import {
  renderDemoChase,
  sendChaseForVendor,
} from "@/lib/chase/send";
import type { ChaseLocale, ChaseTemplateKey } from "@/lib/chase/types";
import { getSessionOrg } from "@/lib/auth/session";
import { DEMO_VENDORS } from "@/lib/demo/store";
import { inngest } from "@/inngest/client";
import { isInngestConfigured } from "@/lib/config";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  vendorId: z.string().min(1),
  templateKey: z
    .enum([
      "doc_request",
      "expiry_30",
      "expiry_14",
      "expiry_7",
      "expiry_1",
      "post_expiry_weekly",
      "thanks_compliant",
      "escalation_customer",
    ])
    .optional(),
  locale: z.enum(["en", "es"]).optional(),
  previewOnly: z.boolean().optional(),
  async: z.boolean().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
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
    return NextResponse.json({
      ...result,
      demo: true,
      note: "Demo mode — set RESEND_API_KEY + Supabase to send live.",
    });
  }

  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
