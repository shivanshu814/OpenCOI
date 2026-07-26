import { DownloadReportButton } from "@/components/download-report-button";
import { EmptyState } from "@/components/empty-state";
import {
  ContentSurface,
  PageFrame,
  PageHeader,
  PageSecondary,
  StatStrip,
} from "@/components/page-frame";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listVendors } from "@/lib/data/documents";
import { dashboardCounts } from "@/lib/data/types";
import { Users } from "lucide-react";
import Link from "next/link";
import { AddVendorForm } from "./add-vendor-form";

export default async function VendorsPage() {
  const vendors = await listVendors();
  const counts = dashboardCounts(vendors);
  const hasData = vendors.length > 0;

  return (
    <PageFrame>
      <PageHeader
        title="Vendors"
        description="Your contractor roster — insurance status, docs, and renewal chase in one place."
        audience="Property managers tracking vendor compliance"
        nextStep={
          !hasData ? (
            "Add your first vendor below, then upload their COI."
          ) : (
            <>
              Open a vendor to chase renewals, or{" "}
              <Link
                href="/app/upload"
                className="text-foreground underline-offset-2 hover:underline"
              >
                upload a COI
              </Link>
              .
            </>
          )
        }
        help="Statuses are traffic-light signals from reviewed COIs — you remain the final approver. Chase reminders go out by email (and SMS when Twilio is configured)."
        live
      />

      {hasData ? (
        <StatStrip
          items={[
            {
              label: "Total",
              value: vendors.length,
              tone: "brand",
            },
            {
              label: "Compliant",
              value: counts.compliant,
              tone: "ok",
            },
            {
              label: "Expiring / gaps",
              value:
                counts.expiring +
                counts.non_compliant +
                counts.missing_docs,
              tone:
                counts.expiring +
                  counts.non_compliant +
                  counts.missing_docs >
                0
                  ? "warn"
                  : "ok",
            },
            {
              label: "In review",
              value: counts.in_review,
              tone: counts.in_review > 0 ? "default" : "ok",
            },
          ]}
        />
      ) : null}

      {/* Add first when empty; keep form accessible when populated */}
      <AddVendorForm />

      <ContentSurface className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>All vendors</CardTitle>
          <CardAction className="self-center">
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs tabular-nums">
              <span className="relative flex size-1.5">
                <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-40" />
                <span className="bg-brand relative inline-flex size-1.5 rounded-full" />
              </span>
              {vendors.length}
            </span>
          </CardAction>
        </CardHeader>

        {!hasData ? (
          <CardContent className="p-4 sm:p-6">
            <EmptyState
              title="No vendors yet"
              description="Add your first vendor above, then upload their COI — we'll extract limits and expirations and start the review pipeline."
              actionHref="/app/upload"
              actionLabel="Go to upload"
              liveHint="No sample vendors — your list stays empty until you add one."
              icon={<Users className="size-5" aria-hidden />}
            />
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground px-4 text-xs font-medium tracking-wide uppercase">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground hidden text-xs font-medium tracking-wide uppercase sm:table-cell">
                  Trade
                </TableHead>
                <TableHead className="text-muted-foreground hidden text-xs font-medium tracking-wide uppercase md:table-cell">
                  Email
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground px-4 text-right text-xs font-medium tracking-wide uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="max-w-[16rem] px-4 font-medium">
                    <Link
                      href={`/app/vendors/${v.id}`}
                      className="block truncate underline-offset-4 hover:underline"
                    >
                      {v.name}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs font-normal sm:hidden">
                      {[v.trade, v.email].filter(Boolean).join(" · ")}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {v.trade}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[14rem] truncate md:table-cell">
                    {v.email}
                  </TableCell>
                  <TableCell>
                    <VendorStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <DownloadReportButton vendorId={v.id} label="Report" />
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/app/upload?vendor=${v.id}`} />}
                      >
                        Upload
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ContentSurface>

      <PageSecondary>
        Document review assistance — not legal, insurance, or professional
        advice. You remain the final approver.
      </PageSecondary>
    </PageFrame>
  );
}
