"use client";

import { ApiSelect } from "@/components/ui/api-select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import type { AuditFilters, StorageLocation, SupplierOption } from "./types";

interface AuditFilterBarProps {
  filters: AuditFilters;
  onFilterChange: (patch: Partial<AuditFilters>) => void;
  locations: StorageLocation[];
  suppliers: SupplierOption[];
  filterCountedPackages: boolean;
  countedPackagesLoading: boolean;
  countedPackageCount: number;
  onFilterCountedToggle: (checked: boolean) => void;
  viewMode: "regular" | "live";
  onReset: () => void;
}

async function fetchCategoryPage(page: number, search: string) {
  const res = await fetchCategoriesList({ page, limit: 20, ...(search ? { search } : {}) });
  return {
    items: (res?.data || []).map((c: any) => ({ id: c.id, name: c.name })),
    totalPages: res?.paginationData?.totalPages || 1,
  };
}

async function fetchBrandPage(page: number, search: string) {
  const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) });
  return {
    items: (res?.data || []).map((b: any) => ({ id: b.id, name: b.name })),
    totalPages: res?.paginationData?.totalPages || 1,
  };
}

export default function AuditFilterBar({
  filters,
  onFilterChange,
  locations,
  suppliers,
  filterCountedPackages,
  countedPackagesLoading,
  countedPackageCount,
  onFilterCountedToggle,
  viewMode,
  onReset,
}: AuditFilterBarProps) {
  return (
    <div className="border-b px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Search By.."
            style={{ maxWidth: 180 }}
            value={filters.searchText}
            onChange={(e) => onFilterChange({ searchText: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") onFilterChange({ searchText: filters.searchText });
            }}
          />
          <Select
            value={filters.searchType}
            onValueChange={(v) => onFilterChange({ searchType: v as AuditFilters["searchType"] })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advertisedIds">Package ID</SelectItem>
              <SelectItem value="metrcTags">Metrc Tag</SelectItem>
              <SelectItem value="packageName">Package Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ApiSelect
          placeholder="All Categories"
          value={filters.category ?? null}
          onChange={(val) => onFilterChange({ category: val as string | null })}
          fetchPage={fetchCategoryPage}
          triggerClassName="w-40"
        />

        <Select
          value={filters.location ?? "__all__"}
          onValueChange={(v) => onFilterChange({ location: v === "__all__" ? null : v })}
        >
          <SelectTrigger className={`w-40 ${viewMode === "live" && !filters.location ? "ring-2 ring-green-400" : ""}`}>
            <SelectValue placeholder="Select Location..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.discrepancyFilter ?? "__all__"}
          onValueChange={(v) => onFilterChange({ discrepancyFilter: v === "__all__" ? undefined : v })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Discrepancy Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="YES">Has Metrc Discrepancy</SelectItem>
            <SelectItem value="NO">No Metrc Discrepancy</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.isActiveFilter === "" ? "__all__" : String(filters.isActiveFilter)}
          onValueChange={(v) =>
            onFilterChange({ isActiveFilter: v === "__all__" ? "" : v === "true" })
          }
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <ApiSelect
          placeholder="Select Brand..."
          value={filters.brand ?? null}
          onChange={(val) => onFilterChange({ brand: val as string | null })}
          fetchPage={fetchBrandPage}
          triggerClassName="w-40"
        />

        <Select
          value={filters.supplier ?? "__all__"}
          onValueChange={(v) => onFilterChange({ supplier: v === "__all__" ? null : v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name || s.licenseNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Switch
            checked={filters.isOutOfStockToggle}
            onCheckedChange={(checked) => onFilterChange({ isOutOfStockToggle: !!checked })}
          />
          <span className={`text-sm font-medium ${filters.isOutOfStockToggle ? "text-blue-500" : "text-muted-foreground"}`}>
            Out of Stock
          </span>
        </div>

        <Button variant="destructive" onClick={onReset} className="ml-auto">
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2 py-0.5">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={filterCountedPackages}
            onCheckedChange={(checked) => onFilterCountedToggle(!!checked)}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {countedPackagesLoading ? "Loading..." : "Hide packages being counted"}
            {filterCountedPackages && !countedPackagesLoading && countedPackageCount > 0 && (
              <span className="ml-1 text-xs font-semibold text-orange-500">({countedPackageCount} hidden)</span>
            )}
          </span>
        </label>
      </div>

      {viewMode === "live" && !filters.location && (
        <div className="mt-1 text-xs font-medium text-green-600">
          Please select a storage location to enable starting a live count session.
        </div>
      )}
    </div>
  );
}
