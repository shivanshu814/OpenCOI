import { DownloadReportButton } from "@/components/download-report-button";
import { EmptyState } from "@/components/empty-state";
import { VendorStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listVendors } from "@/lib/data/documents";
import Link from "next/link";
import { AddVendorForm } from "./add-vendor-form";

export default async function VendorsPage() {
  const vendors = await listVendors();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track insurance status, W-9s, licenses, and chase renewals.
        </p>
      </div>

      <AddVendorForm />

      {vendors.length === 0 ? (
        <EmptyState
          title="No vendors yet"
          description="Add your first vendor above, then upload a COI to start the review pipeline."
          actionHref="/app/upload"
          actionLabel="Go to upload"
        />
      ) : (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/app/vendors/${v.id}`}
                    className="hover:underline"
                  >
                    {v.name}
                  </Link>
                </TableCell>
                <TableCell>{v.trade}</TableCell>
                <TableCell className="text-muted-foreground">
                  {v.email}
                </TableCell>
                <TableCell>
                  <VendorStatusBadge status={v.status} />
                </TableCell>
                <TableCell className="text-right">
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
      </div>
      )}
    </div>
  );
}
