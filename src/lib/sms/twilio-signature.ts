import crypto from "node:crypto";
import { isProductionRuntime } from "@/lib/runtime-env";

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
 * Whether inbound Twilio webhooks must be signature-verified.
 * Always required in production; local/demo may skip when token unset.
 */
export function twilioVerificationEnabled(): boolean {
  return (
    isProductionRuntime() || Boolean(process.env.TWILIO_AUTH_TOKEN?.trim())
  );
}

/** True when verification is required but TWILIO_AUTH_TOKEN is missing. */
export function twilioVerificationMisconfigured(): boolean {
  return twilioVerificationEnabled() && !process.env.TWILIO_AUTH_TOKEN?.trim();
}
