import { inngest } from "@/inngest/client";
import { sendChaseForVendor } from "@/lib/chase/send";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily cron: enqueue chase emails for vendors needing attention (C2).
 * Cadence: 30/14/7/1 pre-expiry + weekly post-expiry (see lib/chase/cadence).
 */
export const runChaseSequences = inngest.createFunction(
  {
    id: "run-chase-sequences",
    triggers: [
      { cron: "0 14 * * *" }, // 14:00 UTC ≈ mid-morning US
      { event: "chase/run-daily" },
    ],
  },
  async ({ step }) => {
    const vendors = await step.run("list-chase-candidates", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("vendors")
        .select("id, org_id, email, status")
        .in("status", ["expiring", "non_compliant", "missing_docs"])
        .not("email", "is", null);

      if (error) throw error;
      return data ?? [];
    });

    const results: {
      vendorId: string;
      ok: boolean;
      skipped?: boolean;
      reason?: string;
    }[] = [];

    for (const v of vendors) {
      const result = await step.run(`chase-${v.id}`, async () => {
        return sendChaseForVendor({
          orgId: v.org_id,
          vendorId: v.id,
        });
      });
      results.push({
        vendorId: v.id,
        ok: result.ok,
        skipped: result.skipped,
        reason: result.reason,
      });
    }

    return {
      candidates: vendors.length,
      sent: results.filter((r) => r.ok && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.ok).length,
    };
  },
);

/** Single-vendor chase (manual API or post-publish hook). */
export const sendChaseEmail = inngest.createFunction(
  {
    id: "send-chase-email",
    triggers: [{ event: "chase/send" }],
  },
  async ({ event, step }) => {
    const data = event.data as {
      orgId: string;
      vendorId: string;
      templateKey?: string;
      locale?: "en" | "es";
    };

    return step.run("send", async () =>
      sendChaseForVendor({
        orgId: data.orgId,
        vendorId: data.vendorId,
        templateKey: data.templateKey as
          | import("@/lib/chase/types").ChaseTemplateKey
          | undefined,
        locale: data.locale,
      }),
    );
  },
);
