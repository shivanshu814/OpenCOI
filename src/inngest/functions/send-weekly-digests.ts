import { inngest } from "@/inngest/client";
import { sendWeeklyDigestForOrg } from "@/lib/digest/weekly";
import { createAdminClient } from "@/lib/supabase/admin";

/** Monday 14:00 UTC — weekly portfolio digest to org notify email. */
export const sendWeeklyDigests = inngest.createFunction(
  {
    id: "send-weekly-digests",
    triggers: [
      { cron: "0 14 * * 1" },
      { event: "digest/run-weekly" },
    ],
  },
  async ({ step }) => {
    const orgs = await step.run("list-orgs", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("orgs")
        .select("id")
        .eq("digest_enabled", true);
      if (error) throw error;
      return data ?? [];
    });

    const results: { orgId: string; ok: boolean; skipped?: boolean }[] = [];

    for (const org of orgs) {
      const result = await step.run(`digest-${org.id}`, async () =>
        sendWeeklyDigestForOrg(org.id),
      );
      results.push({
        orgId: org.id,
        ok: result.ok,
        skipped: result.skipped,
      });
    }

    return {
      orgs: orgs.length,
      sent: results.filter((r) => r.ok && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.ok).length,
    };
  },
);
