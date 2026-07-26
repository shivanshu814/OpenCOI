/**
 * Team invite email.
 *
 * Previously no email was sent at all: the invite action wrote a row to
 * `org_invites` and the UI said "Invite sent", which broke the toast policy
 * ("never say Sent when the send was skipped"). The teammate had to be told
 * out of band to go and sign in, at which point `claim_pending_invites` joined
 * them to the org.
 *
 * The join mechanism is unchanged and deliberately so — there is no invite
 * token to accept. The invite is keyed to the email address, and Supabase only
 * auto-joins a caller whose address it has *verified* via magic link or Google.
 * That means this email carries no secret: forwarding it grants nobody
 * anything, because the recipient still has to prove control of the invited
 * address. So the email is a notification, not a credential.
 */

import { productRoleLabel, toProductRole } from "@/lib/auth/roles";

export type TeamInviteEmail = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** What each role can actually do, in the invitee's words rather than ours. */
function roleCapability(dbRole: string): string {
  switch (toProductRole(dbRole)) {
    case "admin":
      return "You'll be able to review certificates, manage vendors, and change workspace settings and billing.";
    case "manager":
      return "You'll be able to upload certificates, review them, and chase vendors for renewals.";
    case "readonly":
      return "You'll have read-only access — you can see compliance status and reports, but not change anything.";
  }
}

export function renderTeamInviteEmail(input: {
  /** Org display name — what the invitee will recognize. */
  orgName: string;
  /** Who sent it, so the invitee knows why they got this. */
  invitedByEmail: string | null;
  invitedEmail: string;
  role: string;
  /** Absolute sign-in URL, pre-filled with the destination. */
  signInUrl: string;
}): TeamInviteEmail {
  const org = input.orgName.trim() || "a CertShield workspace";
  const roleLabel = productRoleLabel(toProductRole(input.role));
  const inviter = input.invitedByEmail?.trim();

  const subject = `${org} added you to CertShield`;

  // Plain text is the source of truth; the HTML mirrors it. Some recipients
  // (and most corporate gateways) read this version.
  const text = [
    `You've been added to ${org} on CertShield as ${roleLabel}.`,
    "",
    inviter
      ? `${inviter} invited you. CertShield is the tool they use to track vendor certificates of insurance.`
      : "CertShield is the tool this company uses to track vendor certificates of insurance.",
    "",
    roleCapability(input.role),
    "",
    `Sign in with ${input.invitedEmail} — there's no password to create, and you'll join the workspace automatically:`,
    input.signInUrl,
    "",
    "If you weren't expecting this, you can ignore this email. Nothing happens until you sign in.",
    "",
    "— CertShield",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f6f7f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f7f9;padding:24px 0;">
  <tr>
    <td align="center">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">You've been added to ${escapeHtml(org)} on CertShield as ${escapeHtml(roleLabel)}.</div>

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:14px;border:1px solid #e2e5ea;overflow:hidden;">
        <tr><td style="height:4px;background-color:#00B884;line-height:4px;font-size:0;">&nbsp;</td></tr>

        <tr>
          <td style="padding:28px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <div style="font-size:15px;font-weight:700;color:#121b29;letter-spacing:-0.01em;">CertShield</div>
            <div style="font-size:12px;color:#6a727e;margin-top:2px;">COI compliance</div>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:600;color:#121b29;letter-spacing:-0.02em;">
              You've been added to ${escapeHtml(org)}
            </h1>
            <p style="margin:10px 0 0 0;font-size:14px;line-height:1.6;color:#4a5260;">
              ${
                inviter
                  ? `${escapeHtml(inviter)} invited you as <strong style="color:#121b29;">${escapeHtml(roleLabel)}</strong>. CertShield is the tool they use to track vendor certificates of insurance.`
                  : `You've been invited as <strong style="color:#121b29;">${escapeHtml(roleLabel)}</strong>. CertShield is the tool this company uses to track vendor certificates of insurance.`
              }
            </p>
            <p style="margin:12px 0 0 0;font-size:14px;line-height:1.6;color:#4a5260;">
              ${escapeHtml(roleCapability(input.role))}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#00B884" style="border-radius:8px;">
                  <a href="${escapeHtml(input.signInUrl)}" style="display:inline-block;padding:13px 26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                    Sign in and join
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 0 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#6a727e;">
              Sign in with <strong style="color:#4a5260;">${escapeHtml(input.invitedEmail)}</strong> — no password to create. You'll join the workspace automatically. If you weren't expecting this, ignore this email; nothing happens until you sign in.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 28px 32px;">
            <div style="height:1px;background-color:#e2e5ea;line-height:1px;font-size:0;">&nbsp;</div>
            <p style="margin:16px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8b929c;">
              Sent because ${escapeHtml(input.invitedEmail)} was added to a CertShield workspace. This is an account email, not marketing.
            </p>
            <p style="margin:8px 0 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8b929c;">
              Button not working? Paste this into your browser:<br />
              <span style="color:#6a727e;word-break:break-all;">${escapeHtml(input.signInUrl)}</span>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
