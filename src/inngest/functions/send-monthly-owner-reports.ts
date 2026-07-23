import { inngest } from "@/inngest/client";
import { sendMonthlyOwnerReportsForOrg } from "@/lib/reports/owner-send";
import { createAdminClient } from "@/lib/supabase/admin";

/** 1st of each month 15:00 UTC — D3 owner monthly reports. */
export const sendMonthlyOwnerReports = inngest.createFunction(
  {
    id: "send-monthly-owner-reports",
    triggers: [
      { cron: "0 15 1 * *" },
      { event: "owner-report/run-monthly" },
    ],
  },
  async ({ step }) => {
    const orgs = await step.run("list-orgs-with-owner-reports", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("properties")
        .select("org_id")
        .eq("owner_report_enabled", true)
        .not("owner_report_email", "is", null);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((r) => r.org_id as string))];
      return ids.map((id) => ({ id }));
    });

    const results: {
      orgId: string;
      sent: number;
      skipped: number;
      failed: number;
    }[] = [];

    for (const org of orgs) {
      const result = await step.run(`owner-report-${org.id}`, async () =>
        sendMonthlyOwnerReportsForOrg(org.id),
      );
      results.push({
        orgId: org.id,
        sent: result.sent,
        skipped: result.skipped,
        failed: result.failed,
      });
    }

    return {
      orgs: orgs.length,
      sent: results.reduce((s, r) => s + r.sent, 0),
      skipped: results.reduce((s, r) => s + r.skipped, 0),
      failed: results.reduce((s, r) => s + r.failed, 0),
    };
  },
);
