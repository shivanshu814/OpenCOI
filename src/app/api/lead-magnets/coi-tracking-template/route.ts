import { sendOutboundEmail } from "@/lib/email/resend";
import {
  templateDownloadLeadSchema,
  validationErrorBody,
} from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LEADS_INBOX = "hello@getcertshield.app";
const DOWNLOAD_URL = "/downloads/coi-tracking-template.csv";

export async function POST(request: Request) {
  const parsed = templateDownloadLeadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      validationErrorBody(parsed.error, "Lead capture payload invalid"),
      { status: 400 },
    );
  }

  const lead = parsed.data;

  // Honeypot hit — pretend success so bots don't retry.
  if (lead.companyWebsite && lead.companyWebsite.trim().length > 0) {
    return NextResponse.json({ ok: true, downloadUrl: DOWNLOAD_URL });
  }

  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const referer = request.headers.get("referer") ?? "unknown";
  const capturedAt = new Date().toISOString();
  const text = [
    "New spreadsheet template lead",
    "",
    `Email     : ${lead.email}`,
    `Captured  : ${capturedAt}`,
    `Referer   : ${referer}`,
    `User-Agent: ${userAgent}`,
  ].join("\n");
  const html = `<pre style="font-family: -apple-system, ui-monospace, monospace; white-space: pre-wrap; margin: 0;">${escapeHtml(text)}</pre>`;

  const result = await sendOutboundEmail({
    to: LEADS_INBOX,
    replyTo: lead.email,
    subject: "[Lead] COI template download",
    text,
    html,
    tags: [{ name: "kind", value: "template-download-lead" }],
  });

  if (!result.ok) {
    console.error("[lead-magnets/coi-tracking-template] outbound email failed", result.error);
    return NextResponse.json(
      {
        error:
          "We couldn't unlock the template right now. Please try again in a minute.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, downloadUrl: DOWNLOAD_URL });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
