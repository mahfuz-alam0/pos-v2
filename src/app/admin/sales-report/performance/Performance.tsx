"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileText } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeSelector, type SelectedDateResult } from "@/components/ui/date-range-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PdfExportDrawer from "@/components/ui/pdf-export-drawer";

import EmployeePerformanceTable from "./EmployeePerformanceTable";
import EmployeePerformanceByCategoryTable from "./EmployeePerformanceByCategoryTable";
import BrandSummaryTable from "./BrandSummaryTable";
import {
  EXPORT_SECTIONS,
  PDF_COLUMN_CONFIG,
  buildPerformanceHtml,
  exportBudtenderToCsv,
  exportPerformanceToExcel,
} from "./exportConfig";
import type { BrandSummaryRow, EmployeePerformanceByCategoryRow, EmployeePerformanceRow } from "./types";

function toDayString(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function Performance() {
  const { shopDetails } = useShop();

  const todayStr = toDayString(new Date());
  const [range, setRange] = useState<SelectedDateResult>({
    startDate: todayStr,
    endDate: todayStr,
    timeEnabled: false,
  });

  const [budtenderData, setBudtenderData] = useState<EmployeePerformanceRow[]>([]);
  const [categoryData, setCategoryData] = useState<EmployeePerformanceByCategoryRow[]>([]);
  const [brandData, setBrandData] = useState<BrandSummaryRow[]>([]);
  const [pdfOpen, setPdfOpen] = useState(false);

  const startDate = range.startDate ?? undefined;
  const endDate = range.endDate ?? startDate;
  const selectedDate = { startDate, endDate };

  const dateRangeLabel = useMemo(
    () =>
      startDate && endDate
        ? `${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}`
        : "",
    [startDate, endDate],
  );

  const exportData = { budtenderData, categoryData, brandData };

  const exportMetadata = {
    store: shopDetails?.name || shopDetails?.shopName || "",
    dateCreated: format(new Date(), "MM/dd/yyyy"),
    dateRange: dateRangeLabel,
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Performance Report</h1>
              <p className="text-sm text-muted-foreground">
                View employee performance metrics and sales data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector
              setSelectedDate={setRange}
              initialDate={{ startDate: range.startDate, endDate: range.endDate }}
              showAllOption={false}
            />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline">Export</Button>} />
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setPdfOpen(true)}>Export to PDF</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportPerformanceToExcel(
                      exportData,
                      `Performance_Report_${startDate}_to_${endDate}`,
                    )
                  }
                >
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBudtenderToCsv(budtenderData)}>
                  Export to CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <EmployeePerformanceTable selectedDate={selectedDate} onDataLoad={setBudtenderData} />
      <EmployeePerformanceByCategoryTable selectedDate={selectedDate} onDataLoad={setCategoryData} />
      <BrandSummaryTable selectedDate={selectedDate} onDataLoad={setBrandData} />

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={EXPORT_SECTIONS}
        htmlGenerator={buildPerformanceHtml as any}
        columnConfig={PDF_COLUMN_CONFIG}
      />
    </div>
  );
}
