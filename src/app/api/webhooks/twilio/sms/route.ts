import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Twilio inbound SMS webhook — honor STOP instantly (TCPA).
 * Configure Messaging Service → webhook URL: {APP_URL}/api/webhooks/twilio/sms
 */
export async function POST(request: Request) {
  const form = await request.formData();
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
      const digits = from.replace(/\D/g, "");
      const variants = [
        from,
        digits,
        digits.length === 11 && digits.startsWith("1")
          ? `+${digits}`
          : `+1${digits.slice(-10)}`,
      ];

      const { data: vendors } = await admin
        .from("vendors")
        .select("id, org_id, phone")
        .not("phone", "is", null)
        .limit(500);

      const matches = (vendors ?? []).filter((v) => {
        const p = (v.phone as string).replace(/\D/g, "");
        return variants.some((x) => x.replace(/\D/g, "").endsWith(p.slice(-10)));
      });

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
