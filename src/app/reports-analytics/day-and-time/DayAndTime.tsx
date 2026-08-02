"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchDayOfWeekSales } from "@/services/reporting/dayOfWeekSales";
import { fetchHourOfDaySales } from "@/services/reporting/hourOfDaySales";

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
import ExcelExportDrawer from "@/components/ui/excel-export-drawer";

import DayOfWeekTable from "./DayOfWeekTable";
import HourOfDayTable from "./HourOfDayTable";
import { SECTIONS, EXCEL_COLUMN_CONFIG, buildDayAndTimeHtml, buildDayAndTimeExcelSheets, exportDayAndTimeToCsv } from "./exportConfig";
import type { DayOfWeekRow, HourOfDayRow, DayAndTimePagination } from "./types";

const PAGE_SIZE = 30;

function emptyPagination(): DayAndTimePagination {
  return { page: 1, pageSize: PAGE_SIZE, totalEntries: 0, totalPages: 1 };
}

export default function DayAndTime() {
  const { shopId } = useShop();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr,
    endDate: todayStr,
    timeEnabled: false,
  });
  const startDate = selectedDate.startDate ?? todayStr;
  const endDate = selectedDate.endDate ?? startDate;

  const [dayOfWeekData, setDayOfWeekData] = useState<DayOfWeekRow[]>([]);
  const [loadingDayOfWeek, setLoadingDayOfWeek] = useState(false);
  const [dayOfWeekPagination, setDayOfWeekPagination] = useState(emptyPagination());

  const [hourOfDayData, setHourOfDayData] = useState<HourOfDayRow[]>([]);
  const [loadingHourOfDay, setLoadingHourOfDay] = useState(false);
  const [hourOfDayPagination, setHourOfDayPagination] = useState(emptyPagination());

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  const exportData = { dayOfWeekData, hourOfDayData };

  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} – ${format(new Date(endDate), "MMM dd, yyyy")}`;
  const exportMetadata = { dateRange: dateRangeLabel };

  const fetchDayOfWeek = async () => {
    if (!shopId) return;
    setLoadingDayOfWeek(true);
    try {
      const response = await fetchDayOfWeekSales({
        page: dayOfWeekPagination.page,
        limit: dayOfWeekPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setDayOfWeekData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setDayOfWeekPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching day of week data:", error);
    } finally {
      setLoadingDayOfWeek(false);
    }
  };

  const fetchHourOfDay = async () => {
    if (!shopId) return;
    setLoadingHourOfDay(true);
    try {
      const response = await fetchHourOfDaySales({
        page: hourOfDayPagination.page,
        limit: hourOfDayPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setHourOfDayData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setHourOfDayPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching hour of day data:", error);
    } finally {
      setLoadingHourOfDay(false);
    }
  };

  useEffect(() => {
    setDayOfWeekPagination((p) => ({ ...p, page: 1 }));
    setHourOfDayPagination((p) => ({ ...p, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate]);

  useEffect(() => {
    fetchDayOfWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, dayOfWeekPagination.page]);

  useEffect(() => {
    fetchHourOfDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, hourOfDayPagination.page]);

  const handleExportCsv = () => {
    exportDayAndTimeToCsv(exportData, dateRangeLabel, `day_time_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40">
              <Clock className="size-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Day & Time Report</h1>
              <p className="text-sm text-muted-foreground">
                Analyze sales performance by day of week and hour of day to identify peak business periods.
              </p>
            </div>
          </div>
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

      <Card className="p-4 shadow-sm ring-0">
        <DateRangeSelector setSelectedDate={setSelectedDate} initialDate={{ startDate: selectedDate.startDate, endDate: selectedDate.endDate }} showAllOption={false} />
      </Card>

      <DayOfWeekTable
        data={dayOfWeekData}
        loading={loadingDayOfWeek}
        pagination={dayOfWeekPagination}
        onPageChange={(page) => setDayOfWeekPagination((p) => ({ ...p, page }))}
      />

      <HourOfDayTable
        data={hourOfDayData}
        loading={loadingHourOfDay}
        pagination={hourOfDayPagination}
        onPageChange={(page) => setHourOfDayPagination((p) => ({ ...p, page }))}
      />

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={SECTIONS}
        htmlGenerator={buildDayAndTimeHtml as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={SECTIONS}
        excelGenerator={buildDayAndTimeExcelSheets as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
        filename={`day_time_report_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}
