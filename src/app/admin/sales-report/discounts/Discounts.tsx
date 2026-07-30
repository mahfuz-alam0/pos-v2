"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Percent } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchItemDiscountsApplied } from "@/services/reporting/itemDiscountsApplied";
import { fetchItemDiscountsByCategory } from "@/services/reporting/itemDiscountsByCategory";
import { fetchItemDiscountsByProduct } from "@/services/reporting/itemDiscountsByProduct";
import { fetchItemDiscountsByEmployee } from "@/services/reporting/itemDiscountsByEmployee";
import { fetchItemDiscountsByBrand } from "@/services/reporting/itemDiscountsByBrand";

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

import ItemDiscountsAppliedTable from "./ItemDiscountsAppliedTable";
import DiscountsByCategoryTable from "./DiscountsByCategoryTable";
import DiscountsByProductTable from "./DiscountsByProductTable";
import DiscountsByEmployeeTable from "./DiscountsByEmployeeTable";
import DiscountsByBrandTable from "./DiscountsByBrandTable";
import { SECTIONS, EXCEL_COLUMN_CONFIG, buildDiscountsHtml, buildDiscountsExcelSheets, exportDiscountsToCsv } from "./exportConfig";
import type {
  ItemDiscountRow,
  CategoryDiscountRow,
  ProductDiscountRow,
  EmployeeDiscountRow,
  BrandDiscountRow,
  DiscountsPagination,
} from "./types";

const PAGE_SIZE = 10;

function emptyPagination(): DiscountsPagination {
  return { page: 1, pageSize: PAGE_SIZE, totalEntries: 0, totalPages: 1 };
}

export default function Discounts() {
  const { shopId } = useShop();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<SelectedDateResult>({
    startDate: todayStr,
    endDate: todayStr,
    timeEnabled: false,
  });
  const startDate = selectedDate.startDate ?? todayStr;
  const endDate = selectedDate.endDate ?? startDate;

  const [itemDiscountsData, setItemDiscountsData] = useState<ItemDiscountRow[]>([]);
  const [loadingItemDiscounts, setLoadingItemDiscounts] = useState(false);
  const [itemDiscountsPagination, setItemDiscountsPagination] = useState(emptyPagination());

  const [categoryDiscountsData, setCategoryDiscountsData] = useState<CategoryDiscountRow[]>([]);
  const [loadingCategoryDiscounts, setLoadingCategoryDiscounts] = useState(false);
  const [categoryDiscountsPagination, setCategoryDiscountsPagination] = useState(emptyPagination());

  const [productDiscountsData, setProductDiscountsData] = useState<ProductDiscountRow[]>([]);
  const [loadingProductDiscounts, setLoadingProductDiscounts] = useState(false);
  const [productDiscountsPagination, setProductDiscountsPagination] = useState(emptyPagination());

  const [employeeDiscountsData, setEmployeeDiscountsData] = useState<EmployeeDiscountRow[]>([]);
  const [loadingEmployeeDiscounts, setLoadingEmployeeDiscounts] = useState(false);
  const [employeeDiscountsPagination, setEmployeeDiscountsPagination] = useState(emptyPagination());

  const [brandDiscountsData, setBrandDiscountsData] = useState<BrandDiscountRow[]>([]);
  const [loadingBrandDiscounts, setLoadingBrandDiscounts] = useState(false);
  const [brandDiscountsPagination, setBrandDiscountsPagination] = useState(emptyPagination());

  const [pdfOpen, setPdfOpen] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);

  const exportData = {
    itemDiscountsData,
    categoryDiscountsData,
    productDiscountsData,
    employeeDiscountsData,
    brandDiscountsData,
  };

  const dateRangeLabel = `${format(new Date(startDate), "MMM dd, yyyy")} - ${format(new Date(endDate), "MMM dd, yyyy")}`;
  const exportMetadata = { dateRange: dateRangeLabel };

  const fetchItemDiscounts = async () => {
    if (!shopId) return;
    setLoadingItemDiscounts(true);
    try {
      const response = await fetchItemDiscountsApplied({
        page: itemDiscountsPagination.page,
        limit: itemDiscountsPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setItemDiscountsData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setItemDiscountsPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching item discounts:", error);
    } finally {
      setLoadingItemDiscounts(false);
    }
  };

  const fetchCategoryDiscounts = async () => {
    if (!shopId) return;
    setLoadingCategoryDiscounts(true);
    try {
      const response = await fetchItemDiscountsByCategory({
        page: categoryDiscountsPagination.page,
        limit: categoryDiscountsPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setCategoryDiscountsData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setCategoryDiscountsPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching category discounts:", error);
    } finally {
      setLoadingCategoryDiscounts(false);
    }
  };

  const fetchProductDiscounts = async () => {
    if (!shopId) return;
    setLoadingProductDiscounts(true);
    try {
      const response = await fetchItemDiscountsByProduct({
        page: productDiscountsPagination.page,
        limit: productDiscountsPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setProductDiscountsData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setProductDiscountsPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching product discounts:", error);
    } finally {
      setLoadingProductDiscounts(false);
    }
  };

  const fetchEmployeeDiscounts = async () => {
    if (!shopId) return;
    setLoadingEmployeeDiscounts(true);
    try {
      const response = await fetchItemDiscountsByEmployee({
        page: employeeDiscountsPagination.page,
        limit: employeeDiscountsPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setEmployeeDiscountsData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setEmployeeDiscountsPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching employee discounts:", error);
    } finally {
      setLoadingEmployeeDiscounts(false);
    }
  };

  const fetchBrandDiscounts = async () => {
    if (!shopId) return;
    setLoadingBrandDiscounts(true);
    try {
      const response = await fetchItemDiscountsByBrand({
        page: brandDiscountsPagination.page,
        limit: brandDiscountsPagination.pageSize,
        startDate,
        endDate,
        shopId,
      });
      setBrandDiscountsData(response?.data?.data || []);
      const pData = response?.data?.paginationData;
      if (pData) {
        setBrandDiscountsPagination((prev) => ({ ...prev, totalEntries: pData.totalEntries, totalPages: pData.totalPages || 1 }));
      }
    } catch (error) {
      console.error("Error fetching brand discounts:", error);
    } finally {
      setLoadingBrandDiscounts(false);
    }
  };

  useEffect(() => {
    setItemDiscountsPagination((p) => ({ ...p, page: 1 }));
    setCategoryDiscountsPagination((p) => ({ ...p, page: 1 }));
    setProductDiscountsPagination((p) => ({ ...p, page: 1 }));
    setEmployeeDiscountsPagination((p) => ({ ...p, page: 1 }));
    setBrandDiscountsPagination((p) => ({ ...p, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate]);

  useEffect(() => {
    fetchItemDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, itemDiscountsPagination.page]);

  useEffect(() => {
    fetchCategoryDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, categoryDiscountsPagination.page]);

  useEffect(() => {
    fetchProductDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, productDiscountsPagination.page]);

  useEffect(() => {
    fetchEmployeeDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, employeeDiscountsPagination.page]);

  useEffect(() => {
    fetchBrandDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, startDate, endDate, brandDiscountsPagination.page]);

  const handleExportCsv = () => {
    exportDiscountsToCsv(exportData, dateRangeLabel, `discounts_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="p-4 shadow-sm ring-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-rose-50 p-3 dark:bg-rose-950/40">
              <Percent className="size-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Discounts Report</h1>
              <p className="text-sm text-muted-foreground">
                View product discount details including all discount types, discount reason, location, employee, invoice, product, and discount amount.
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

      <ItemDiscountsAppliedTable
        data={itemDiscountsData}
        loading={loadingItemDiscounts}
        pagination={itemDiscountsPagination}
        onPageChange={(page) => setItemDiscountsPagination((p) => ({ ...p, page }))}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DiscountsByCategoryTable
          data={categoryDiscountsData}
          loading={loadingCategoryDiscounts}
          pagination={categoryDiscountsPagination}
          onPageChange={(page) => setCategoryDiscountsPagination((p) => ({ ...p, page }))}
        />
        <DiscountsByProductTable
          data={productDiscountsData}
          loading={loadingProductDiscounts}
          pagination={productDiscountsPagination}
          onPageChange={(page) => setProductDiscountsPagination((p) => ({ ...p, page }))}
        />
      </div>

      <DiscountsByEmployeeTable
        data={employeeDiscountsData}
        loading={loadingEmployeeDiscounts}
        pagination={employeeDiscountsPagination}
        onPageChange={(page) => setEmployeeDiscountsPagination((p) => ({ ...p, page }))}
      />

      <DiscountsByBrandTable
        data={brandDiscountsData}
        loading={loadingBrandDiscounts}
        pagination={brandDiscountsPagination}
        onPageChange={(page) => setBrandDiscountsPagination((p) => ({ ...p, page }))}
      />

      <PdfExportDrawer
        open={pdfOpen}
        onClose={() => setPdfOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={SECTIONS}
        htmlGenerator={buildDiscountsHtml as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
      />
      <ExcelExportDrawer
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
        data={exportData}
        metadata={exportMetadata}
        availableSections={SECTIONS}
        excelGenerator={buildDiscountsExcelSheets as any}
        columnConfig={EXCEL_COLUMN_CONFIG}
        filename={`discounts_report_${format(new Date(), "yyyy-MM-dd")}`}
      />
    </div>
  );
}
