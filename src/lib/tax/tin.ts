import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { isProductionRuntime } from "@/lib/runtime-env";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer | null {
  const raw = process.env.TIN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  // Accept 64-hex (32 bytes) or any string → sha256
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw, "utf8").digest();
}

export function isTinEncryptionConfigured(): boolean {
  return Boolean(encryptionKey());
}

export type EncryptedTin = {
  ciphertext: string;
  iv: string;
  last4: string;
};

/** Field-level encrypt TIN/SSN. Digits only; last4 stored for masked UI. */
export function encryptTin(plain: string): EncryptedTin {
  const digits = plain.replace(/\D/g, "");
  if (digits.length < 4) {
    throw new Error("TIN too short");
  }
  const last4 = digits.slice(-4);
  const key = encryptionKey();
  if (!key) {
    if (isProductionRuntime()) {
      throw new Error(
        "TIN_ENCRYPTION_KEY is required in production to store W-9/TIN data",
      );
    }
    // Demo / missing key: store base64 marker (not production-safe; flagged)
    const iv = randomBytes(12).toString("base64url");
    return {
      ciphertext: `demo:${Buffer.from(digits).toString("base64url")}`,
      iv,
      last4,
    };
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(digits, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString("base64url"),
    iv: iv.toString("base64url"),
    last4,
  };
}

export function decryptTin(ciphertext: string, iv: string): string | null {
  if (ciphertext.startsWith("demo:")) {
    try {
      return Buffer.from(ciphertext.slice(5), "base64url").toString("utf8");
    } catch {
      return null;
    }
  }
  const key = encryptionKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(ciphertext, "base64url");
    const data = buf.subarray(0, buf.length - 16);
    const tag = buf.subarray(buf.length - 16);
    const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

export function maskTin(
  last4: string | null | undefined,
  tinType?: string | null,
): string {
  if (!last4) return "—";
  if (tinType === "ssn") return `***-**-${last4}`;
  return `**-***${last4}`;
}
