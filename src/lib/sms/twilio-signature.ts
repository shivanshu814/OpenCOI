import crypto from "node:crypto";

/**
 * Validate Twilio's `X-Twilio-Signature` (C3 hardening).
 * Algorithm: HMAC-SHA1(authToken, fullUrl + concat(sortedKey+value)) → base64.
 * Constant-time compared. See twilio.com/docs/usage/security.
 */
export function validateTwilioSignature(input: {
  authToken: string;
  signature: string | null | undefined;
  url: string;
  params: Record<string, string>;
}): boolean {
  if (!input.signature) return false;

  let data = input.url;
  for (const key of Object.keys(input.params).sort()) {
    data += key + input.params[key];
  }

  const expected = crypto
    .createHmac("sha1", input.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Whether inbound Twilio webhooks must be signature-verified. False in
 * demo/local (no auth token) so testing stays frictionless; true in prod.
 */
export function twilioVerificationEnabled(): boolean {
  return Boolean(process.env.TWILIO_AUTH_TOKEN?.trim());
}
