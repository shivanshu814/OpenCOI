import { inngest } from "@/inngest/client";
import { extractDocument } from "@/inngest/functions/extract-document";
import {
  runChaseSequences,
  sendChaseEmail,
} from "@/inngest/functions/run-chase-sequences";
import { sendWeeklyDigests } from "@/inngest/functions/send-weekly-digests";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    extractDocument,
    runChaseSequences,
    sendChaseEmail,
    sendWeeklyDigests,
  ],
});
