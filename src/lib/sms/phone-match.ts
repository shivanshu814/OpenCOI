/**
 * Normalize a phone to last-10 digits for US-centric matching.
 * Returns null if fewer than 10 digits.
 */
export function phoneLast10(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Build PostgREST `.or()` filter for common phone string variants.
 * Avoids loading all vendors into memory (cross-tenant scan).
 */
export function phoneMatchOrFilter(from: string): string | null {
  const last10 = phoneLast10(from);
  if (!last10) return null;

  const variants = new Set<string>([
    from.trim(),
    last10,
    `+1${last10}`,
    `1${last10}`,
    `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`,
    `${last10.slice(0, 3)}-${last10.slice(3, 6)}-${last10.slice(6)}`,
  ]);

  return Array.from(variants)
    .map((v) => `phone.eq.${v}`)
    .join(",");
}
