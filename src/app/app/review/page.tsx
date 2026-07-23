import { VerdictBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Internal review queue
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Side-by-side PDF + extraction · corrections become golden-set
            cases.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/app/upload" />}
        >
          Upload COI
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Documents awaiting review</CardTitle>
          <CardAction>
            <span className="text-muted-foreground text-xs tabular-nums">
              {queue.length}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
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
            {queue.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium">Queue empty</p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed">
                  Upload a COI and it lands here once extraction finishes —
                  every verdict passes review before publish.
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
