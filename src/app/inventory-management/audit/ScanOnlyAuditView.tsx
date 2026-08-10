"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Barcode, TriangleAlert, X } from "lucide-react";

import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { createIndependentCommittedAuditSession } from "@/services/committedAuditSessions/createIndependent";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AuditFilterBar from "./AuditFilterBar";
import type { AuditFilters, StorageLocation, SupplierOption } from "./types";

interface ScannedPackage {
  id: string;
  advertisedId?: string;
  name?: string;
  productCategory?: any;
  supplierName?: string;
  scanCount: number;
}

interface ScanOnlyAuditViewProps {
  shopId: string | number;
  filters: AuditFilters;
  onFilterChange: (patch: Partial<AuditFilters>) => void;
  locations: StorageLocation[];
  suppliers: SupplierOption[];
  filterCountedPackages: boolean;
  countedPackagesLoading: boolean;
  countedPackageCount: number;
  onFilterCountedToggle: (checked: boolean) => void;
  onSubmitted: () => void;
}

// "Regular Audit (Scan only)" — ported from the old app's viewMode==="scanOnly".
// Scan a package id, look it up (scoped to the selected storage location),
// bump a running count, then submit the whole batch directly — no live
// session involved (committed-audit-sessions/create-independent).
export default function ScanOnlyAuditView({
  shopId,
  filters,
  onFilterChange,
  locations,
  suppliers,
  filterCountedPackages,
  countedPackagesLoading,
  countedPackageCount,
  onFilterCountedToggle,
  onSubmitted,
}: ScanOnlyAuditViewProps) {
  const locationId = filters.location ?? null;

  const [input, setInput] = useState("");
  const [packages, setPackages] = useState<ScannedPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const totalScanned = packages.reduce((sum, p) => sum + (p.scanCount || 1), 0);

  const handleLookup = async (rawValue: string) => {
    const trimmed = rawValue?.trim();
    if (!trimmed || !locationId) return;

    setLoading(true);
    try {
      const res = await fetchPackagesMinimalExtended(shopId, {
        page: 1,
        limit: 1,
        isFinished: false,
        sortByCreatedAt: -1,
        advertisedIds: trimmed,
        isActive: true,
        storageLocationId: locationId,
      });
      const found = res?.data?.packages?.[0];

      if (!found) {
        toast.warning(`Package not found: "${trimmed}"`);
        return;
      }

      setStartedAt((prev) => prev || new Date().toISOString());
      setPackages((prev) => {
        const existingIndex = prev.findIndex((p) => p.id === found.id);
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            scanCount: (next[existingIndex].scanCount || 1) + 1,
          };
          toast.success(`✓ ${found.name || found.advertisedId} — Count: ${next[existingIndex].scanCount}`);
          return next;
        }
        toast.success(`✓ ${found.name || found.advertisedId} — Count: 1`);
        return [{ ...found, scanCount: 1 }, ...prev];
      });

      setFlashingId(found.id);
      setTimeout(() => setFlashingId(null), 1400);
    } catch {
      toast.error(`Failed to look up "${trimmed}"`);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  const handleClear = () => {
    setPackages([]);
    setStartedAt(null);
  };

  const handleSubmit = async () => {
    if (!locationId || packages.length === 0) return;
    setSubmitting(true);
    try {
      await createIndependentCommittedAuditSession({
        shopId,
        storageLocationId: locationId,
        startedAtISO: startedAt || new Date().toISOString(),
        packagesCountData: packages.map((p) => ({
          packageId: p.id,
          finalQty: p.scanCount || 1,
          startingCount: 0,
        })),
      });
      toast.success("Audit submitted successfully");
      setPackages([]);
      setStartedAt(null);
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit audit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AuditFilterBar
        filters={filters}
        onFilterChange={onFilterChange}
        locations={locations}
        suppliers={suppliers}
        filterCountedPackages={filterCountedPackages}
        countedPackagesLoading={countedPackagesLoading}
        countedPackageCount={countedPackageCount}
        onFilterCountedToggle={onFilterCountedToggle}
        locationHintText="Please select a storage location to enable scanning."
        locationDisabled={packages.length > 0}
        locationDisabledReason="Clear the scanned packages first to change the storage location."
      />

      <div className="relative flex flex-col gap-4" aria-disabled={!locationId}>
        {!locationId && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <TriangleAlert className="size-4 shrink-0" />
            Select a storage location above to start scanning.
          </div>
        )}

        <div
          className="rounded-2xl border-2 border-blue-300 bg-linear-to-br from-blue-50 to-blue-100 p-4 shadow-sm dark:border-blue-800 dark:from-blue-950/40 dark:to-blue-900/30"
          style={!locationId ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Barcode className="size-6" />
            </div>
            <Input
              ref={inputRef}
              value={input}
              disabled={loading || !locationId}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                if (val.trim().length >= 5) {
                  debounceRef.current = setTimeout(() => handleLookup(val), 300);
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (debounceRef.current) clearTimeout(debounceRef.current);
                handleLookup(input);
              }}
              placeholder="Scan or type Package ID…"
              className="h-11 min-w-60 flex-1 border-blue-400 bg-white text-base shadow-none dark:bg-background"
            />
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {loading
                ? "Looking up…"
                : packages.length > 0
                  ? `${packages.length} pkg${packages.length !== 1 ? "s" : ""} · ${totalScanned} scanned`
                  : "Ready to scan…"}
            </span>
            {packages.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleClear}>
                <X className="size-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>

        <div
          className="overflow-hidden rounded-xl ring-1 ring-foreground/10"
          style={!locationId ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Package ID</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Scan Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                    Scan a package to add it to this list.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((p) => (
                  <TableRow
                    key={p.id}
                    className={flashingId === p.id ? "bg-green-100 transition-colors duration-1000 dark:bg-green-950/40" : ""}>
                    <TableCell className="font-mono text-xs">{p.advertisedId}</TableCell>
                    <TableCell className="max-w-60 truncate">{p.name}</TableCell>
                    <TableCell>
                      {typeof p.productCategory === "object" ? p.productCategory?.name : p.productCategory || "-"}
                    </TableCell>
                    <TableCell>{p.supplierName || "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                        {p.scanCount || 1}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!locationId || packages.length === 0 || submitting}
            onClick={handleSubmit}
            title={
              !locationId
                ? "Select a storage location first"
                : packages.length === 0
                  ? "Scan at least one package first"
                  : undefined
            }>
            {submitting ? "Submitting..." : `Submit${packages.length > 0 ? ` (${packages.length})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
