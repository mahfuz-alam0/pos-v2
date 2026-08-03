"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import Drawer from "@/components/ui/Drawer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ScanModeBar from "./ScanModeBar";
import CountingModeToggle from "./CountingModeToggle";
import AuditTable from "./AuditTable";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchBrandsList } from "@/services/brands/list";
import type { AuditPackageRow, LiveAuditSession, PendingAdjustment, StorageLocation, SupplierOption } from "./types";

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

interface LiveCartDrawerProps {
  open: boolean;
  onClose: () => void;
  session: LiveAuditSession | null;
  packages: AuditPackageRow[];
  locationMap: Record<string, string>;
  locations: StorageLocation[];
  suppliers: SupplierOption[];
  countedPackageKeys: Set<string>;
  pendingAdjustments: Record<string, PendingAdjustment>;
  onQtyChange: (value: string, record: AuditPackageRow, locId: string | null) => void;
  onScanMatch: (found: AuditPackageRow, newCount: number) => void;
}

export default function LiveCartDrawer({
  open,
  onClose,
  session,
  packages,
  locationMap,
  locations,
  suppliers,
  countedPackageKeys,
  pendingAdjustments,
  onQtyChange,
  onScanMatch,
}: LiveCartDrawerProps) {
  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<"advertisedIds" | "metrcTags" | "packageName">("advertisedIds");
  const [category, setCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<string | null>(null);
  const [discrepancyFilter, setDiscrepancyFilter] = useState<string | undefined>(undefined);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | "">(true);
  const [isOutOfStock, setIsOutOfStock] = useState(false);
  const [filterCounted, setFilterCounted] = useState(false);
  const [countingMode, setCountingMode] = useState<"manual" | "scan">("manual");
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const [flashingRows, setFlashingRows] = useState<Record<string, boolean>>({});
  const [scanInput, setScanInput] = useState("");

  const minsLeft = useMemo(() => {
    if (!session) return null;
    const endTime = session.endsAt || session.expiresAt || session.endTime || session.end || session.endsAtISO;
    if (!endTime) return null;
    return Math.max(0, Math.round((new Date(endTime).getTime() - Date.now()) / 60000));
  }, [session]);

  const displayPackages = useMemo(() => {
    let result = packages;
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter((r) => {
        if (searchType === "packageName") return (r.name || "").toLowerCase().includes(q);
        if (searchType === "metrcTags") return (r.metrcTag || "").toLowerCase().includes(q);
        return (r.advertisedId || "").toLowerCase().includes(q);
      });
    }
    if (category) {
      result = result.filter((r) => {
        const catId = typeof r.productCategory === "object" ? r.productCategory?.id || r.productCategory?._id : null;
        return catId === category;
      });
    }
    if (location) result = result.filter((r) => r.rowLocationId === location);
    if (brand) {
      result = result.filter((r) => {
        const brandId = typeof r.productBrand === "object" ? r.productBrand?.id || r.productBrand?._id : null;
        return brandId === brand;
      });
    }
    if (supplier) result = result.filter((r) => r.supplierId === supplier || r.supplier?.id === supplier);
    if (discrepancyFilter === "YES") {
      result = result.filter((r) => r.metrQuantity != null && r.quantityLeft !== r.metrQuantity);
    } else if (discrepancyFilter === "NO") {
      result = result.filter((r) => r.metrQuantity == null || r.quantityLeft === r.metrQuantity);
    }
    if (isActiveFilter !== "") result = result.filter((r) => r.isActive === isActiveFilter);
    if (isOutOfStock) result = result.filter((r) => !r.quantityLeft || r.quantityLeft <= 0);
    if (filterCounted) result = result.filter((r) => !countedPackageKeys.has(r.id));
    return result;
  }, [
    packages,
    searchText,
    searchType,
    category,
    location,
    brand,
    supplier,
    discrepancyFilter,
    isActiveFilter,
    isOutOfStock,
    filterCounted,
    countedPackageKeys,
  ]);

  const handleReset = () => {
    setSearchText("");
    setCategory(null);
    setLocation(null);
    setBrand(null);
    setSupplier(null);
    setDiscrepancyFilter(undefined);
    setIsActiveFilter(true);
    setIsOutOfStock(false);
    setFilterCounted(false);
    setCountingMode("manual");
    setScanCounts({});
    setFlashingRows({});
    setScanInput("");
  };

  const handleScan = (rawValue: string) => {
    const trimmed = rawValue?.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    const found = displayPackages.find((pkg) => pkg.advertisedId && pkg.advertisedId.toLowerCase() === lower);

    if (found) {
      const rowKey = found.rowLocationId ? `${found.id}-${found.rowLocationId}` : `${found.id}`;
      const newCount = (scanCounts[found.advertisedId || ""] || 0) + 1;
      setScanCounts((prev) => ({ ...prev, [found.advertisedId || ""]: newCount }));
      onScanMatch(found, newCount);

      setFlashingRows((prev) => ({ ...prev, [rowKey]: true }));
      setTimeout(() => {
        setFlashingRows((prev) => {
          const next = { ...prev };
          delete next[rowKey];
          return next;
        });
      }, 1400);

      toast.success(`✓ ${found.name || found.advertisedId} — Count: ${newCount}`);
    } else {
      toast.warning(`Package not found in session: "${trimmed}"`);
    }
    setScanInput("");
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={typeof window !== "undefined" ? Math.round(window.innerWidth * 0.8) : 1000} zIndex={1001}>
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <h2 className="text-xl font-bold">Live Count Session</h2>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {session?.id?.slice(0, 18)}…
            {packages.length > 0 && (
              <span className="ml-2 font-semibold text-blue-600">
                {packages.length} package{packages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {session && (
          <div className="grid grid-cols-4 gap-3 border-b bg-green-50 px-4 py-3 dark:bg-green-950/20">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Session</div>
              <div className="text-sm font-medium">{session.id?.slice(0, 18)}…</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Location</div>
              <div className="text-sm font-medium">
                {session.storageLocationId ? locationMap[session.storageLocationId] || session.storageLocationId : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Started</div>
              <div className="text-sm font-medium">
                {session.startedAtISO ? format(new Date(session.startedAtISO), "MMM d, yyyy HH:mm") : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ends</div>
              <div className="text-sm font-medium">
                {session.endsAtISO ? format(new Date(session.endsAtISO), "MMM d, HH:mm") : "—"}
                {minsLeft !== null && <span className="ml-1 text-xs text-green-600">· {minsLeft} min left</span>}
              </div>
            </div>
          </div>
        )}

        <div className="border-b px-4 py-2">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="Search By.."
                style={{ maxWidth: 180 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                items={[
                  { value: "advertisedIds", label: "Package ID" },
                  { value: "metrcTags", label: "Metrc Tag" },
                  { value: "packageName", label: "Package Name" },
                ]}
                value={searchType}
                onValueChange={(v) => setSearchType(v as typeof searchType)}
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

            <ApiSelect placeholder="All Categories" value={category} onChange={(v) => setCategory(v as string | null)} fetchPage={fetchCategoryPage} triggerClassName="w-40" />

            <Select
              items={[{ value: "__all__", label: "All Locations" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
              value={location ?? "__all__"}
              onValueChange={(v) => setLocation(v === "__all__" ? null : v)}
            >
              <SelectTrigger className="w-40 ring-2 ring-green-400 data-placeholder:ring-0">
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
              items={[
                { value: "__all__", label: "All" },
                { value: "YES", label: "Has Metrc Discrepancy" },
                { value: "NO", label: "No Metrc Discrepancy" },
              ]}
              value={discrepancyFilter ?? "__all__"}
              onValueChange={(v) => setDiscrepancyFilter(v === "__all__" ? undefined : v)}
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
              items={[
                { value: "__all__", label: "All" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={isActiveFilter === "" ? "__all__" : String(isActiveFilter)}
              onValueChange={(v) => setIsActiveFilter(v === "__all__" ? "" : v === "true")}
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

            <ApiSelect placeholder="Select Brand..." value={brand} onChange={(v) => setBrand(v as string | null)} fetchPage={fetchBrandPage} triggerClassName="w-40" />

            <Select
              items={[{ value: "__all__", label: "All Suppliers" }, ...suppliers.map((s) => ({ value: s.id, label: s.name || s.licenseNumber }))]}
              value={supplier ?? "__all__"}
              onValueChange={(v) => setSupplier(v === "__all__" ? null : v)}
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
              <Switch checked={isOutOfStock} onCheckedChange={(c) => setIsOutOfStock(!!c)} />
              <span className={`text-sm font-medium ${isOutOfStock ? "text-blue-500" : "text-muted-foreground"}`}>
                Out of Stock
              </span>
            </div>

            <CountingModeToggle value={countingMode} onChange={setCountingMode} />

            <Button variant="destructive" onClick={handleReset} className="ml-auto">
              Reset
            </Button>
          </div>

          <label className="flex items-center gap-2 py-0.5">
            <Checkbox checked={filterCounted} onCheckedChange={(c) => setFilterCounted(!!c)} />
            <span className="text-sm font-medium text-muted-foreground">Hide packages being counted</span>
          </label>

          {!location && (
            <div className="mt-1 text-xs font-medium text-green-600">
              Please select a location to view accurate location-wise quantities for counting.
            </div>
          )}
        </div>

        {countingMode === "scan" && (
          <ScanModeBar
            value={scanInput}
            onChange={setScanInput}
            onScan={handleScan}
            scanCounts={scanCounts}
            onClear={() => {
              setScanCounts({});
              setFlashingRows({});
            }}
          />
        )}

        <div className="flex-1 overflow-hidden px-4 pb-4">
          <AuditTable
            data={displayPackages}
            loading={false}
            locationMap={locationMap}
            locationFilter={location}
            countingMode={countingMode}
            scanCounts={scanCounts}
            flashingRows={flashingRows}
            pendingAdjustments={pendingAdjustments}
            onQtyChange={onQtyChange}
          />
        </div>
      </div>
    </Drawer>
  );
}
