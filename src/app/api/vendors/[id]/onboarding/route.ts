import {
  canAdminSensitive,
  canWriteOrgData,
} from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import { normalizeStateCode } from "@/lib/geo/us-states";
import { boardLookupUrl } from "@/lib/licenses/boards";
import { createClient } from "@/lib/supabase/server";
import { encryptTin, maskTin } from "@/lib/tax/tin";
import { insertAuditEvent } from "@/lib/audit/write";
import {
  validationErrorBody,
  vendorOnboardingSchema,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

/** Trim to null so an emptied field clears the column instead of storing "". */
function cleanText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: vendorId } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ demo: true, tax: null, licenses: [], agreements: [] });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const [{ data: tax }, { data: licenses }, { data: agreements }] =
    await Promise.all([
      supabase
        .from("vendor_tax_profiles")
        .select(
          "id, legal_name, tin_type, tin_last4, address_line, city, state, postal_code, collected_at, w9_document_id",
        )
        .eq("vendor_id", vendorId)
        .eq("org_id", session.orgId)
        .maybeSingle(),
      supabase
        .from("vendor_licenses")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("vendor_agreements")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("org_id", session.orgId)
        .order("created_at", { ascending: false }),
    ]);

  const showTin = canAdminSensitive(session.role);
  return NextResponse.json({
    tax: tax
      ? {
        ...tax,
        tin_masked: maskTin(tax.tin_last4, tax.tin_type),
        tin_visible_to_admins_only: true,
        can_view_full: showTin,
      }
      : null,
    licenses: licenses ?? [],
    agreements: agreements ?? [],
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: vendorId } = await context.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canWriteOrgData(session.role)) {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }

  const parsed = vendorOnboardingSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Unknown action"),
      { status: 400 },
    );
  }
  const body = parsed.data;

  const supabase = await createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id, name, email")
    .eq("id", vendorId)
    .eq("org_id", session.orgId)
    .maybeSingle();
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  if (body.action === "upsert_tax") {
    if (!canAdminSensitive(session.role)) {
      return NextResponse.json(
        { error: "Only Admins can store W-9 / TIN" },
        { status: 403 },
      );
    }
    // Address is optional, but a non-empty state must normalize ("pa",
    // "PA", "Pennsylvania" all become "PA"); anything else is a typo.
    const rawState = body.state?.trim() ?? "";
    const state = normalizeStateCode(rawState);
    if (rawState && !state) {
      return NextResponse.json(
        { error: "Invalid state — use a two-letter code like PA." },
        { status: 400 },
      );
    }
    let tin_ciphertext: string | null = null;
    let tin_iv: string | null = null;
    let tin_last4: string | null = null;
    if (body.tin?.trim()) {
      const enc = encryptTin(body.tin);
      tin_ciphertext = enc.ciphertext;
      tin_iv = enc.iv;
      tin_last4 = enc.last4;
    }
    const now = new Date().toISOString();
    const row = {
      org_id: session.orgId,
      vendor_id: vendorId,
      legal_name: body.legal_name?.trim() || vendor.name,
      tin_type: body.tin_type ?? "ein",
      tin_ciphertext,
      tin_iv,
      tin_last4,
      address_line: cleanText(body.address_line, 300),
      city: cleanText(body.city, 100),
      state,
      postal_code: cleanText(body.postal_code, 20),
      collected_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase
      .from("vendor_tax_profiles")
      .upsert(row, { onConflict: "org_id,vendor_id" })
      .select(
        "id, legal_name, tin_type, tin_last4, collected_at",
      )
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
    actor_email: session.email,
      entity_type: "vendor",
      entity_id: vendorId,
      action: "w9_tax_profile_upserted",
      after_state: {
        tin_last4,
        tin_type: body.tin_type ?? "ein",
        legal_name: row.legal_name,
      },
    });
    return NextResponse.json({
      ok: true,
      tax: { ...data, tin_masked: maskTin(data.tin_last4, data.tin_type) },
    });
  }

  if (body.action === "add_license") {
    // Same rule as the tax profile: empty stays allowed, a non-empty state
    // must normalize to a canonical code.
    const rawState = body.license_state?.trim() ?? "";
    const state = normalizeStateCode(rawState);
    if (rawState && !state) {
      return NextResponse.json(
        { error: "Invalid license state — use a two-letter code like PA." },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("vendor_licenses")
      .insert({
        org_id: session.orgId,
        vendor_id: vendorId,
        license_number: cleanText(body.license_number, 100),
        state,
        trade: cleanText(body.trade, 100),
        expires_on: body.expires_on || null,
        board_lookup_url: boardLookupUrl(state),
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
    actor_email: session.email,
      entity_type: "vendor",
      entity_id: vendorId,
      action: "license_added",
      after_state: data,
    });
    return NextResponse.json({ ok: true, license: data });
  }

  if (body.action === "create_agreement") {
    const { createAgreementSigning, isDocumensoConfigured } = await import(
      "@/lib/esign/documenso"
    );
    const title =
      body.agreement_title?.trim() || "Hold-harmless / indemnification";
    const signerEmail =
      body.signer_email?.trim() || vendor.email || session.email;
    if (!signerEmail) {
      return NextResponse.json(
        { error: "Signer email required" },
        { status: 400 },
      );
    }

    // Documenso signs a file. Sending only a title created an empty draft,
    // and a draft has no signing page — which is why every generated link
    // 404'd. The file is the org's own uploaded agreement (migration 025);
    // we never draft one, because writing indemnification language would be
    // legal advice (docs/08 §3). The demo path still needs no PDF.
    let pdfBase64: string | undefined;
    if (isDocumensoConfigured()) {
      const { loadAgreementPdfBase64 } = await import(
        "@/lib/esign/agreement-template"
      );
      const { data: orgRow } = await supabase
        .from("orgs")
        .select("agreement_template_path, agreement_template_name")
        .eq("id", session.orgId)
        .maybeSingle();
      const template = await loadAgreementPdfBase64(supabase, orgRow ?? {});
      if (!template.ok) {
        return NextResponse.json({ error: template.error }, { status: 400 });
      }
      pdfBase64 = template.base64;
    }

    const signed = await createAgreementSigning({
      title,
      signerEmail,
      signerName: vendor.name,
      pdfBase64,
    });
    if (!signed.ok) {
      return NextResponse.json({ error: signed.error }, { status: 502 });
    }
    const { data, error } = await supabase
      .from("vendor_agreements")
      .insert({
        org_id: session.orgId,
        vendor_id: vendorId,
        title,
        documenso_document_id: signed.documentId,
        signing_url: signed.signingUrl,
        status: signed.demo ? "demo" : "sent",
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await insertAuditEvent(supabase, {
      org_id: session.orgId,
      actor_type: "admin",
      actor_id: session.userId,
    actor_email: session.email,
      entity_type: "vendor",
      entity_id: vendorId,
      action: "agreement_esign_sent",
      after_state: {
        agreement_id: data.id,
        demo: signed.demo,
        signing_url: signed.signingUrl,
      },
    });
    return NextResponse.json({ ok: true, agreement: data, demo: signed.demo });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
