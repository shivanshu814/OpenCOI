import { canAdminSensitive } from "@/lib/auth/roles";
import { getSessionOrg } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config";
import {
  AGREEMENT_BUCKET,
  agreementTemplatePath,
  looksLikePdf,
  MAX_AGREEMENT_BYTES,
} from "@/lib/esign/agreement-template";
import { createClient } from "@/lib/supabase/server";
import { insertAuditEvent } from "@/lib/audit/write";
import { NextResponse } from "next/server";

/**
 * A5 — the org's own agreement PDF, the document vendors actually e-sign.
 *
 * Admin-only: this file becomes a binding agreement sent out under the
 * customer's name, so it sits with billing and API keys rather than with
 * everyday vendor edits. CertShield never authors it (docs/08 §3 — no legal
 * advice); it stores and routes what the customer's lawyer approved.
 */

type OrgTemplateRow = {
  agreement_template_path: string | null;
  agreement_template_name: string | null;
  agreement_template_uploaded_at: string | null;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ demo: true, template: null });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("orgs")
    .select(
      "agreement_template_path, agreement_template_name, agreement_template_uploaded_at",
    )
    .eq("id", session.orgId)
    .maybeSingle();

  const row = data as OrgTemplateRow | null;
  return NextResponse.json({
    template: row?.agreement_template_path
      ? {
          name: row.agreement_template_name,
          uploadedAt: row.agreement_template_uploaded_at,
        }
      : null,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Demo mode — connect Supabase to upload an agreement." },
      { status: 503 },
    );
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Attach the agreement PDF as `file`." },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_AGREEMENT_BYTES) {
    return NextResponse.json(
      { error: "Agreement must be 10 MB or smaller." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the bytes, not the extension or the browser-supplied MIME type.
  if (!looksLikePdf(bytes)) {
    return NextResponse.json(
      { error: "That file is not a PDF. Export or print your agreement to PDF and try again." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const path = agreementTemplatePath(session.orgId, file.name);

  const { error: uploadErr } = await supabase.storage
    .from(AGREEMENT_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const uploadedAt = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("orgs")
    .update({
      agreement_template_path: path,
      agreement_template_name: file.name,
      agreement_template_uploaded_at: uploadedAt,
    })
    .eq("id", session.orgId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "org",
    entity_id: session.orgId,
    action: "agreement_template_uploaded",
    after_state: { name: file.name, bytes: file.size },
  });

  return NextResponse.json({
    ok: true,
    template: { name: file.name, uploadedAt },
  });
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Demo mode" }, { status: 503 });
  }
  const session = await getSessionOrg();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAdminSensitive(session.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("orgs")
    .select("agreement_template_path")
    .eq("id", session.orgId)
    .maybeSingle();

  const path = (data as { agreement_template_path: string | null } | null)
    ?.agreement_template_path;
  if (path) {
    // Best effort: clearing the pointer is what actually disables e-sign, so a
    // storage hiccup must not leave the org stuck with a template it removed.
    await supabase.storage.from(AGREEMENT_BUCKET).remove([path]);
  }

  const { error } = await supabase
    .from("orgs")
    .update({
      agreement_template_path: null,
      agreement_template_name: null,
      agreement_template_uploaded_at: null,
    })
    .eq("id", session.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await insertAuditEvent(supabase, {
    org_id: session.orgId,
    actor_type: "admin",
    actor_id: session.userId,
    actor_email: session.email,
    entity_type: "org",
    entity_id: session.orgId,
    action: "agreement_template_removed",
  });

  return NextResponse.json({ ok: true, template: null });
}
