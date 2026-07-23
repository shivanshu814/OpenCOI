import { VerdictBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { listReviewQueue, listVendors } from "@/lib/data/documents";
import Link from "next/link";

export default async function ReviewQueuePage() {
  const [queue, vendors] = await Promise.all([
    listReviewQueue(),
    listVendors(),
  ]);
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Internal review queue
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Side-by-side PDF + extraction · corrections become golden-set cases.
        </p>
      </div>

      <div className="divide-y rounded-lg border">
        {queue.map((doc) => {
          const vendor = vendorById.get(doc.vendor_id);
          return (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{vendor?.name}</p>
                <p className="text-muted-foreground text-xs">{doc.file_name}</p>
              </div>
              <div className="flex items-center gap-3">
                {doc.overall_verdict ? (
                  <VerdictBadge verdict={doc.overall_verdict} />
                ) : null}
                <Button
                  size="sm"
                  render={<Link href={`/app/review/${doc.id}`} />}
                >
                  Open
                </Button>
              </div>
            </div>
          );
        })}
        {queue.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            Queue empty.
          </p>
        ) : null}
      </div>
    </div>
  );
}
