import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateTwilioSignature } from "./twilio-signature";

const AUTH = "test_auth_token";
const URL = "https://getcertshield.vercel.app/api/webhooks/twilio/sms";
const PARAMS = { From: "+15551234567", Body: "STOP", To: "+15559876543" };

function sign(url: string, params: Record<string, string>, token = AUTH): string {
  let data = url;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  return crypto.createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
}

test("accepts a correctly-signed request", () => {
  const signature = sign(URL, PARAMS);
  assert.equal(
    validateTwilioSignature({ authToken: AUTH, signature, url: URL, params: PARAMS }),
    true,
  );
});

test("rejects a missing signature", () => {
  assert.equal(
    validateTwilioSignature({ authToken: AUTH, signature: null, url: URL, params: PARAMS }),
    false,
  );
});

test("rejects a tampered body", () => {
  const signature = sign(URL, PARAMS);
  assert.equal(
    validateTwilioSignature({
      authToken: AUTH,
      signature,
      url: URL,
      params: { ...PARAMS, Body: "START" },
    }),
    false,
  );
});

test("rejects a signature made with a different auth token", () => {
  const signature = sign(URL, PARAMS, "attacker_token");
  assert.equal(
    validateTwilioSignature({ authToken: AUTH, signature, url: URL, params: PARAMS }),
    false,
  );
});
