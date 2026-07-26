/**
 * Clipboard copy with feedback.
 *
 * `navigator.clipboard` is unavailable on insecure origins and can be denied by
 * permission policy, in which case the raw API silently rejects and the user is
 * left staring at a button that "did nothing". Everything in the product copies
 * through here so success and failure both surface as a toast.
 */
import { notifyError, notifySuccess } from "@/lib/ui/toast";

export async function copyToClipboard(
  text: string,
  options?: {
    /** Toast on success, e.g. "Portal link copied". Pass null to stay silent. */
    successMessage?: string | null;
    /** Shown when the browser blocks the write. Pass null to stay silent. */
    errorMessage?: string | null;
    description?: string;
  },
): Promise<boolean> {
  const successMessage =
    options?.successMessage === undefined ? "Copied" : options.successMessage;

  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      throw new Error("Clipboard unavailable");
    }
    await navigator.clipboard.writeText(text);
    if (successMessage) {
      notifySuccess(successMessage, { description: options?.description });
    }
    return true;
  } catch {
    const errorMessage =
      options?.errorMessage === undefined ? "Could not copy" : options.errorMessage;
    if (errorMessage) {
      notifyError(errorMessage, {
        description:
          "Your browser blocked clipboard access. Select the text and copy it manually.",
      });
    }
    return false;
  }
}
