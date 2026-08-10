"use client";

// Shared building blocks for the 5 "sales by X" reports (Classification, Day,
// Employee, Location, Product) — they all share the same date + category +
// brand + delivery/source filter bar shape, and the same dynamic-tax-column
// table + totals-row pattern. Factored here once instead of copy-pasted 5x.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useShop } from "@/context/shop-context";
import { listCategories } from "@/services/classifications/listCategories";
import { listBrands } from "@/services/classifications/listBrands";
import { fetchCategoriesList as fetchCategoriesPage } from "@/services/categories/list";
import { fetchBrandsList as fetchBrandsPage } from "@/services/brands/list";
import { fetchProductsList } from "@/services/products/list";
import { fetchShopsData } from "@/services/shops/list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import type { CategoryOption, BrandOption, ShopOption, TaxBreakdownItem, ReportPagination } from "./types";

export function money(v: any) {
  const n = Number(v);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function pct(v: any) {
  const n = Number(v);
  return `${Number.isFinite(n) ? n.toFixed(2) : "0.00"}%`;
}

export const DELIVERY_METHOD_OPTIONS = [
  { value: "__all__", label: "All Delivery Methods" },
  { value: "IN_STORE", label: "In Store" },
  { value: "PICK_UP", label: "Pick Up" },
  { value: "DELIVERY", label: "Delivery" },
];

export const SOURCE_OPTIONS = [
  { value: "__all__", label: "All Sources" },
  { value: "POS", label: "POS" },
  { value: "ECOM", label: "E-Commerce" },
  { value: "WEEDMAPS", label: "Weedmaps" },
];

/** Loads the category + brand option lists once (used by every filter bar). */
export function useCategoryBrandOptions() {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);

  useEffect(() => {
    listCategories({ page: 1, limit: 100 }).then((res) => setCategories(res?.data ?? []));
    listBrands({ page: 1, limit: 100 }).then((res) => setBrands(res?.data ?? []));
  }, []);

  return { categories, brands };
}

export function SimpleSelect({
  value,
  onValueChange,
  options,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select items={options} value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className ?? "w-full sm:w-52"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Extracts the sorted, de-duplicated set of tax names present across rows. */
export function useUniqueTaxNames(rows: { taxBreakdown?: TaxBreakdownItem[] }[]) {
  const names = new Set<string>();
  rows.forEach((row) => row.taxBreakdown?.forEach((t) => t.name && names.add(t.name)));
  return Array.from(names).sort();
}

export function taxAmount(row: { taxBreakdown?: TaxBreakdownItem[] }, taxName: string) {
  return row.taxBreakdown?.find((t) => t.name === taxName)?.totalAmount || 0;
}

/** Re-exported for convenience in report files that need the current shop id. */
export { useShop };

/** Loads the shop list once (used by Employee/Location/Product report shop filters). */
export function useShops() {
  const [shops, setShops] = useState<ShopOption[]>([]);
  useEffect(() => {
    fetchShopsData().then((res) => setShops(res?.data ?? []));
  }, []);
  return shops;
}

/** Paginated category fetcher for `ApiSelect`/`MultiApiSelect`. */
export function useCategoryPageFetcher() {
  return useCallback(async (page: number, search: string) => {
    const res = await fetchCategoriesPage({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name || c.classification?.name || "Unnamed" })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);
}

/** Paginated brand fetcher for `ApiSelect`/`MultiApiSelect`. */
export function useBrandPageFetcher() {
  return useCallback(async (page: number, search: string) => {
    const res = await fetchBrandsPage({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);
}

/** Paginated product fetcher for `ApiSelect`. */
export function useProductPageFetcher() {
  return useCallback(async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 20, search });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  }, []);
}

/* ---------------- shared dynamic-tax-column table ---------------- */
/* Classification / Day / Employee / Location / Product tables all share the */
/* same shape: fixed base columns, then one column per tax name found in the */
/* data, plus a bold totals row computed from the page-level summary. */

export interface SalesByColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: T) => ReactNode;
  /** Value used for the totals-row cell; omit to leave the totals cell blank. */
  total?: (rows: T[]) => ReactNode;
}

export function SalesByTable<T extends { taxBreakdown?: TaxBreakdownItem[] }>({
  data,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  columns,
  rowKey,
  pageSizeOptions,
}: {
  data: T[];
  loading: boolean;
  pagination: ReportPagination;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  columns: SalesByColumn<T>[];
  rowKey: (row: T, i: number) => string;
  pageSizeOptions?: number[];
}) {
  const taxNames = useUniqueTaxNames(data);

  const taxTotal = (taxName: string) => data.reduce((sum, r) => sum + taxAmount(r, taxName), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-xl ring-1 ring-foreground/10 *:data-[slot=table-container]:overflow-visible" style={{ maxHeight: "calc(100vh - 420px)" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>
                  {c.label}
                </TableHead>
              ))}
              {taxNames.map((name) => (
                <TableHead key={`tax_${name}`} className="text-right">
                  Tax: {name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="border-b-0 bg-muted/60 font-semibold shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
              {columns.map((c, i) => (
                <TableCell key={c.key} className={c.align === "right" ? "text-right" : ""}>
                  {i === 0 ? "TOTAL" : c.total ? c.total(data) : ""}
                </TableCell>
              ))}
              {taxNames.map((name) => (
                <TableCell key={`tax_total_${name}`} className="text-right">
                  {money(taxTotal(name))}
                </TableCell>
              ))}
            </TableRow>
            {data.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={columns.length + taxNames.length} className="py-8 text-center text-muted-foreground">
                  No data available. Please run the report to see results.
                </TableCell>
              </TableRow>
            )}
            {data.map((row, i) => (
              <TableRow
                key={rowKey(row, i)}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : "bg-background"}`}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.align === "right" ? "text-right" : ""}>
                    {c.render ? c.render(row) : String((row as any)[c.key] ?? "-")}
                  </TableCell>
                ))}
                {taxNames.map((name) => (
                  <TableCell key={`tax_${name}`} className="text-right">
                    {money(taxAmount(row, name))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalEntries={pagination.totalEntries}
        pageSize={pagination.pageSize}
        loading={loading}
        onPageChange={onPageChange}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
