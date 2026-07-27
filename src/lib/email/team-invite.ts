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
import { escapeHtml, paragraphHtml, renderBrandedEmailHtml } from "./layout";

export type TeamInviteEmail = {
  subject: string;
  text: string;
  html: string;
};

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

  const html = renderBrandedEmailHtml({
    preheader: `You've been added to ${org} on CertShield as ${roleLabel}.`,
    heading: `You've been added to ${org}`,
    bodyHtml: [
      paragraphHtml(
        inviter
          ? `${escapeHtml(inviter)} invited you as <strong style="color:#121b29;">${escapeHtml(roleLabel)}</strong>. CertShield is the tool they use to track vendor certificates of insurance.`
          : `You've been invited as <strong style="color:#121b29;">${escapeHtml(roleLabel)}</strong>. CertShield is the tool this company uses to track vendor certificates of insurance.`,
      ),
      paragraphHtml(escapeHtml(roleCapability(input.role))),
      paragraphHtml(
        `Sign in with <strong style="color:#121b29;">${escapeHtml(input.invitedEmail)}</strong> — no password to create. You'll join the workspace automatically. If you weren't expecting this, ignore this email; nothing happens until you sign in.`,
      ),
    ].join("\n"),
    cta: { label: "Sign in and join", url: input.signInUrl },
    footerNote: `Sent because ${escapeHtml(input.invitedEmail)} was added to a CertShield workspace. This is an account email, not marketing.`,
  });

  return { subject, text, html };
}
