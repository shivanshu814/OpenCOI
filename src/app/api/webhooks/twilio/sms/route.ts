import { createAdminClient } from "@/lib/supabase/admin";
import { phoneLast10, phoneMatchOrFilter } from "@/lib/sms/phone-match";
import {
  twilioVerificationEnabled,
  twilioVerificationMisconfigured,
  validateTwilioSignature,
} from "@/lib/sms/twilio-signature";
import { NextResponse } from "next/server";

/**
 * Twilio inbound SMS webhook — honor STOP instantly (TCPA).
 * Configure Messaging Service → webhook URL: {APP_URL}/api/webhooks/twilio/sms
 */
export async function POST(request: Request) {
  // Prod fail-closed: never accept unauthenticated STOP on a deployed host.
  if (twilioVerificationMisconfigured()) {
    console.error(
      "twilio sms webhook: TWILIO_AUTH_TOKEN required in production",
    );
    return new NextResponse("<Response></Response>", {
      status: 503,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const form = await request.formData();

  if (twilioVerificationEnabled()) {
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) params[k] = String(v);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
    const url = `${appUrl}/api/webhooks/twilio/sms`;
    const ok = validateTwilioSignature({
      authToken: process.env.TWILIO_AUTH_TOKEN!.trim(),
      signature: request.headers.get("x-twilio-signature"),
      url,
      params,
    });
    if (!ok) {
      return new NextResponse("<Response></Response>", {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "").trim().toUpperCase();

  if (!from) {
    return new NextResponse("<Response></Response>", {
      status: 400,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const isStop =
    body === "STOP" ||
    body === "STOPALL" ||
    body === "UNSUBSCRIBE" ||
    body === "CANCEL" ||
    body === "END" ||
    body === "QUIT";

  if (isStop) {
    try {
      const admin = createAdminClient();
      const orFilter = phoneMatchOrFilter(from);
      const last10 = phoneLast10(from);

      // Prefer exact-variant SQL filter; fall back to last-10 ilike only for
      // that suffix — never load an unbounded cross-tenant vendor list.
      let matches: { id: string; org_id: string; phone: string | null }[] = [];

      if (orFilter) {
        const { data } = await admin
          .from("vendors")
          .select("id, org_id, phone")
          .or(orFilter)
          .limit(50);
        matches = (data ?? []) as typeof matches;
      }

      // Catch formatting variants PostgREST equality missed (spaces, dots).
      if (matches.length === 0 && last10) {
        const { data } = await admin
          .from("vendors")
          .select("id, org_id, phone")
          .not("phone", "is", null)
          .like("phone", `%${last10}`)
          .limit(50);
        matches = ((data ?? []) as typeof matches).filter((v) => {
          const p = phoneLast10(v.phone ?? "");
          return p === last10;
        });
      }

      const now = new Date().toISOString();
      for (const v of matches) {
        await admin
          .from("vendors")
          .update({ sms_opt_out_at: now, updated_at: now })
          .eq("id", v.id);

        await admin.from("audit_events").insert({
          org_id: v.org_id,
          actor_type: "vendor",
          actor_id: from,
          entity_type: "vendor",
          entity_id: v.id,
          action: "sms_opt_out_stop",
          after_state: { from, body },
        });
      }
    } catch (e) {
      console.error("twilio stop webhook", e);
    }

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You are opted out of CertShield SMS. No further texts will be sent.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}
