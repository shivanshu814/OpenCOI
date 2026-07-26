import { EmptyState } from "@/components/empty-state";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
} from "@/components/page-frame";
import { VerdictBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listReviewQueue, listVendors } from "@/lib/data/documents";
import { FileText } from "lucide-react";
import Link from "next/link";

export default async function ReviewQueuePage() {
  const [queue, vendors] = await Promise.all([
    listReviewQueue(),
    listVendors(),
  ]);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  return (
    <PageFrame>
      <PageHeader
        title="Internal review queue"
        description="Check AI-extracted fields against the PDF before a verdict reaches the customer."
        audience="Internal reviewers — you approve every verdict"
        nextStep={
          queue.length === 0
            ? "Queue is clear — upload a COI when the next certificate arrives."
            : "Open the oldest item, confirm or correct fields, then publish for customer decision."
        }
        help="Until the Month 3 accuracy gate, every verdict still passes internal review before publish. Corrections become golden-set regression cases. You remain the final approver."
        live
        actions={
          <Button variant="outline" render={<Link href="/app/upload" />}>
            Upload COI
          </Button>
        }
      />

      <ContentSurface className="gap-0 py-0">
        <CardHeader className="border-b">
          <CardTitle>Documents awaiting review</CardTitle>
          <CardAction>
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs tabular-nums">
              <span className="relative flex size-1.5">
                <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
                <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
              </span>
              {queue.length}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {queue.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                title="Queue empty"
                description="Upload a COI and it lands here once extraction finishes — every verdict passes review before publish."
                actionHref="/app/upload"
                actionLabel="Upload COI"
                liveHint="Listening for extractions"
                icon={<FileText className="size-5" aria-hidden />}
              />
            </div>
          ) : (
            <div className="divide-y">
              {queue.map((doc) => {
                const vendor = vendorById.get(doc.vendor_id);
                return (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {vendor?.name ?? "Vendor"}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {doc.file_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.overall_verdict ? (
                        <VerdictBadge verdict={doc.overall_verdict} />
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/app/review/${doc.id}`} />}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </ContentSurface>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. Customer remains the final approver after publish.
      </PageSecondary>
    </PageFrame>
  );
}
