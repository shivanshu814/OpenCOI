import { DownloadReportButton } from "@/components/download-report-button";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import Link from "next/link";
import { AddVendorForm } from "./add-vendor-form";

const STATUS_LEGEND = [
  { key: "compliant", label: "Compliant", dot: "bg-emerald-500" },
  { key: "expiring", label: "Expiring", dot: "bg-amber-400" },
  { key: "non_compliant", label: "Non-compliant", dot: "bg-red-500" },
  { key: "missing_docs", label: "Missing docs", dot: "bg-slate-400" },
  { key: "in_review", label: "In review", dot: "bg-sky-500" },
] as const;

export default async function VendorsPage() {
  const vendors = await listVendors();
  const counts = dashboardCounts(vendors);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track insurance status, W-9s, licenses, and chase renewals.
          </p>
        </div>
        {vendors.length > 0 ? (
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {STATUS_LEGEND.filter((s) => counts[s.key] > 0).map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-xs">
                <span className={`size-2 rounded-full ${s.dot}`} />
                <dt className="text-muted-foreground">{s.label}</dt>
                <dd className="font-medium tabular-nums">{counts[s.key]}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <AddVendorForm />

      <Card className="min-w-0 gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>All vendors</CardTitle>
          <CardAction className="self-center">
            <span className="text-muted-foreground text-xs tabular-nums">
              {vendors.length}
            </span>
          </CardAction>
        </CardHeader>

        {vendors.length === 0 ? (
          <CardContent className="px-6 py-14 text-center">
            <p className="text-sm font-medium">No vendors yet</p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-relaxed">
              Add your first vendor above, then upload their COI — we&rsquo;ll
              extract limits and expirations and start the review pipeline.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              render={<Link href="/app/upload" />}
            >
              Go to upload
            </Button>
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
      </Card>
    </div>
  );
}
