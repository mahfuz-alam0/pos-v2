"use client";

// Shared building blocks for the 5 "sales by X" reports (Classification, Day,
// Employee, Location, Product) — they all share the same date + category +
// brand + delivery/source filter bar shape, and the same dynamic-tax-column
// table + totals-row pattern. Factored here once instead of copy-pasted 5x.

import { useEffect, useState } from "react";
import { useShop } from "@/context/shop-context";
import { fetchCategoriesList } from "@/services/classifications/listCategories";
import { fetchBrandsList } from "@/services/classifications/listBrands";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CategoryOption, BrandOption, TaxBreakdownItem } from "./types";

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
    fetchCategoriesList({ page: 1, limit: 100 }).then((res) => setCategories(res?.data ?? []));
    fetchBrandsList({ page: 1, limit: 100 }).then((res) => setBrands(res?.data ?? []));
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
