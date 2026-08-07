"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { fetchReferralSourceReport } from "@/services/customers/referralSourceReport";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import {
  SECTIONS,
  EXCEL_COLUMN_CONFIG,
  buildReferralSourceHtml,
  buildReferralSourceExcelSheets,
  exportReferralSourceToCsv,
} from "./exportConfig";

export default function ReferralSourceReportTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchReferralSourceReport();
        setRows(res?.report ?? []);
        setTotal(res?.total ?? 0);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load referral source report");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleExportCsv = () => {
    if (!rows.length) {
      toast.warning("No data to export");
      return;
    }
    exportReferralSourceToCsv(rows, total, `referral_source_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success("CSV downloaded");
  };

  const exportData = { referralData: rows, total };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="gap-0 p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-lg font-semibold">Referral Source Report</h1>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline">Export</Button>} />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExcelOpen(true)}>Export to Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>Export to CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <Card className="gap-0 p-4">
        <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b-0">
              <TableRow className="bg-muted/60">
                <TableHead>Referral Source</TableHead>
                <TableHead>Total Customers</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`s-${i}`} className="border-b-0">
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!loading && rows.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    No data found.
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row, i) => (
                  <TableRow key={row._id ?? i} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                    <TableCell>{row.label || "N/A"}</TableCell>
                    <TableCell>{row.count ?? 0}</TableCell>
                    <TableCell>{total > 0 ? `${((row.count / total) * 100).toFixed(1)}%` : "N/A"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={{}}
        availableSections={SECTIONS}
        htmlGenerator={buildReferralSourceHtml as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportData}
        metadata={{}}
        availableSections={SECTIONS}
        excelGenerator={buildReferralSourceExcelSheets as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
        filename={`referral_source_report_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}
