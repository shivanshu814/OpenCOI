import { BrandLoader } from "@/components/ui/loader";

/**
 * Review-detail route transition. Same single loading language as the rest
 * of the workspace — the old 2-column skeleton guessed at a layout the real
 * page frequently didn't have (no-extraction state, failed state), so the
 * guess flashed and then contradicted itself.
 */
export default function ReviewDetailLoading() {
  return <BrandLoader label="Preparing the review…" />;
}
