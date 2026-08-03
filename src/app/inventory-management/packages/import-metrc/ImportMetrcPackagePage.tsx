"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PackageSearch, Search, TriangleAlert } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchMetrcCredentials } from "@/services/metrcConfig/getCredentials";
import { fetchMetrcPackageData } from "@/services/metrcConfig/getMetrcPackage";
import { importMetrcPackage } from "@/services/metrcConfig/importMetrcPackage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Shape of a single METRC package search result, as returned by
// GET /metrc-packages/get-metrc-package-data (metrc's raw package payload —
// distinct from the MetrcSnapshotData stored on already-imported packages).
interface MetrcSearchResult {
  Label?: string;
  Quantity?: number;
  UnitOfMeasureAbbreviation?: string;
  UnitOfMeasureName?: string;
  LocationName?: string;
  Item?: {
    Name?: string;
    ProductCategoryName?: string;
    UnitWeight?: number;
    UnitWeightUnitOfMeasureName?: string;
  };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-1.5">
      <span className="w-48 shrink-0 text-sm font-semibold">{label}</span>
      <span className="text-sm">{value ?? "-"}</span>
    </div>
  );
}

export default function ImportMetrcPackagePage() {
  const { shopId } = useShop();

  const [checkingCredentials, setCheckingCredentials] = useState(true);
  const [credentialsValid, setCredentialsValid] = useState(false);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [metrcItem, setMetrcItem] = useState<MetrcSearchResult | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setCheckingCredentials(true);
      try {
        const res = await fetchMetrcCredentials(shopId as string);
        const credentials = res?.data?.data?.credentials;
        setCredentialsValid(Boolean(res?.data?.success && credentials?.enabled));
      } catch {
        setCredentialsValid(false);
      } finally {
        setCheckingCredentials(false);
      }
    })();
  }, [shopId]);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed || !shopId) return;
    setSearching(true);
    setSearched(false);
    try {
      const res = await fetchMetrcPackageData(shopId as string, trimmed);
      setMetrcItem(res?.data?.data ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch packages.");
      setMetrcItem(null);
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const handleImport = async () => {
    if (!metrcItem?.Label || !shopId) return;
    setImporting(true);
    try {
      const res = await importMetrcPackage(shopId as string, metrcItem.Label);
      if (res?.data?.success) {
        toast.success("Package imported successfully.");
        setMetrcItem(null);
        setSearched(false);
        setQuery("");
      }
    } catch (err: any) {
      const detail = err?.error ? ` ${err.error}` : "";
      toast.error(`Failed to import package.${detail}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/inventory-management/packages">Packages</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Import From Metrc</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-lg font-semibold">Import From Metrc</h1>

      {checkingCredentials ? (
        <Skeleton className="h-24 w-full max-w-2xl" />
      ) : !credentialsValid ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Invalid METRC Credentials</p>
            <p>Please input valid METRC credentials and try again before importing packages.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex max-w-lg items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter a Metrc Tag / Package ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                className="pl-8"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {searching ? (
            <div className="max-w-2xl text-sm text-muted-foreground">Searching...</div>
          ) : searched && metrcItem ? (
            <div className="max-w-2xl rounded-xl bg-muted/40 p-5 ring-1 ring-foreground/10">
              <div className="mb-3 border-b border-border pb-3">
                <p className="text-xs text-muted-foreground">Metrc Tag</p>
                <p className="text-lg font-semibold">{metrcItem.Label ?? "-"}</p>
              </div>

              <div className="flex flex-col">
                <DetailRow label="Package Name" value={metrcItem.Item?.Name} />
                <DetailRow label="Category" value={metrcItem.Item?.ProductCategoryName} />
                <DetailRow
                  label="Metrc Qty"
                  value={
                    metrcItem.Quantity != null
                      ? `${metrcItem.Quantity} ${metrcItem.UnitOfMeasureAbbreviation ?? ""}`.trim()
                      : "-"
                  }
                />
                <DetailRow
                  label="Unit Weight"
                  value={
                    metrcItem.Item?.UnitWeight != null
                      ? `${metrcItem.Item.UnitWeight} ${metrcItem.Item?.UnitWeightUnitOfMeasureName ?? ""}`.trim()
                      : "-"
                  }
                />
                <DetailRow label="Metrc Storage Location" value={metrcItem.LocationName} />
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : searched ? (
            <div className="flex max-w-2xl flex-col items-center justify-center gap-3 py-12 text-center">
              <PackageSearch className="size-10 text-muted-foreground" />
              <h2 className="text-base font-semibold">No Results Found</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                We couldn&apos;t find any results matching your search criteria. Please try adjusting your search
                terms.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
