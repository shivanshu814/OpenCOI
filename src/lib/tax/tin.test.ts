import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptTin, encryptTin, maskTin } from "./tin";

describe("A2 TIN encryption", () => {
  it("masks last4", () => {
    assert.equal(maskTin("6789", "ein"), "**-***6789");
    assert.equal(maskTin("4321", "ssn"), "***-**-4321");
  });

  it("round-trips in demo mode without TIN_ENCRYPTION_KEY", () => {
    const prev = process.env.TIN_ENCRYPTION_KEY;
    const prevVercel = process.env.VERCEL;
    delete process.env.TIN_ENCRYPTION_KEY;
    delete process.env.VERCEL;
    const enc = encryptTin("12-3456789");
    assert.equal(enc.last4, "6789");
    assert.ok(enc.ciphertext.startsWith("demo:"));
    assert.equal(decryptTin(enc.ciphertext, enc.iv), "123456789");
    if (prev !== undefined) process.env.TIN_ENCRYPTION_KEY = prev;
    else delete process.env.TIN_ENCRYPTION_KEY;
    if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
    else delete process.env.VERCEL;
  });
});
