import { BrandLoader } from "@/components/ui/loader";

/**
 * Workspace route transition. One branded mark, breathing — not a mosaic of
 * gray boxes guessing at the next page's layout (which flashed and lied
 * whenever the real page didn't match the guess). With the 30s client cache
 * this only appears on a genuinely cold segment, so it should feel like a
 * held breath, not an apology.
 */
export default function WorkspaceLoading() {
  return <BrandLoader label="Loading workspace…" />;
}
