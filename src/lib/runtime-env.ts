/**
 * Shared prod vs local detection for fail-closed webhook / PII guards.
 * Vercel sets VERCEL=1; NODE_ENV=production covers other hosts.
 */
export function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
  );
}
