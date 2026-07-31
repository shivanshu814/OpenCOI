import { sendOutboundEmail } from "@/lib/email/resend";
import {
  careersApplySchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const HIRING_INBOX = "hello@getcertshield.app";

/**
 * Public form endpoint — no auth. A few things to know:
 *
 *  - No persistence. Applications are emailed to the hiring inbox and that's
 *    it. Fine at low volume; if we ever need a review UI, add a table.
 *  - Silent honeypot. Bots fill the hidden `companyWebsite` field; when they
 *    do we return 200 so they don't retry, but skip the email so we don't
 *    fill our inbox with garbage. Legitimate applicants leave it blank.
 *  - Uses the same outbound path as customer chase mail (Resend → verified
 *    getcertshield.app), so DKIM/SPF align and the notification doesn't land
 *    in spam.
 */
export async function POST(request: Request) {
  const parsed = careersApplySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Application invalid"),
      { status: 400 },
    );
  }

  const app = parsed.data;

  // Honeypot hit — pretend success, don't email, don't log the payload.
  if (app.companyWebsite && app.companyWebsite.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const lines: string[] = [
    `Role      : ${app.jobSlug}`,
    `Name      : ${app.name}`,
    `Email     : ${app.email}`,
    app.linkedinUrl ? `LinkedIn  : ${app.linkedinUrl}` : null,
    app.location ? `Location  : ${app.location}` : null,
    app.yearsExperience !== null && app.yearsExperience !== undefined && app.yearsExperience !== ""
      ? `Experience: ${app.yearsExperience} yrs`
      : null,
    "",
    "Pitch:",
    app.pitch,
    "",
    "— Reply directly to this email to reach the applicant.",
  ].filter((l): l is string => l !== null);

  const text = lines.join("\n");
  const html = `<pre style="font-family: -apple-system, ui-monospace, monospace; white-space: pre-wrap; margin: 0;">${escapeHtml(text)}</pre>`;

  const result = await sendOutboundEmail({
    to: HIRING_INBOX,
    replyTo: app.email,
    subject: `[Careers] ${app.jobSlug} — ${app.name}`,
    text,
    html,
    tags: [{ name: "kind", value: "careers-application" }],
  });

  if (!result.ok) {
    // Don't leak the transport error to the public; log for us, generic to them.
    console.error("[careers/apply] outbound email failed", result.error);
    return NextResponse.json(
      {
        error:
          "We couldn't record your application right now. Please email hello@getcertshield.app directly.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
