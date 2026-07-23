import { DownloadReportButton } from "@/components/download-report-button";
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
          CRUD for Week 1 audits. CSV import lands with email-in (Week 2).
        </p>
      </div>

      <AddVendorForm />

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
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-8 text-center text-sm"
                >
                  No vendors yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
