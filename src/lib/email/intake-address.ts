/** B1: shared inbound domain — {token}@in.getcertshield.app */

export const DEFAULT_INBOUND_DOMAIN = "in.getcertshield.app";

export function inboundDomain(): string {
  return process.env.INBOUND_EMAIL_DOMAIN?.trim() || DEFAULT_INBOUND_DOMAIN;
}

export function intakeEmailForToken(token: string): string {
  return `${token}@${inboundDomain()}`;
}

/** Pull org token from To / OriginalRecipient (Postmark). */
export function parseIntakeTokenFromRecipients(
  addresses: Array<string | null | undefined>,
): string | null {
  const domain = inboundDomain().toLowerCase();
  for (const raw of addresses) {
    if (!raw) continue;
    // "Name <token@in.getcertshield.app>" or bare address; may be comma-separated
    for (const part of raw.split(/[,;]/)) {
      const angle = part.match(/<([^>]+)>/);
      const email = (angle?.[1] ?? part).trim().toLowerCase();
      const at = email.lastIndexOf("@");
      if (at < 1) continue;
      const local = email.slice(0, at);
      const host = email.slice(at + 1);
      if (host === domain && /^[a-z0-9_-]{6,64}$/i.test(local)) {
        return local.toLowerCase();
      }
    }
  }
  return null;
}

export const DEMO_INTAKE_TOKEN = "demo";
export const DEMO_INTAKE_EMAIL = intakeEmailForToken(DEMO_INTAKE_TOKEN);
