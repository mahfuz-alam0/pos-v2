"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Pencil, Plus, Search, Upload, Users } from "lucide-react";

import { useDebounce } from "@/hooks/useDebounce";
import { listCustomers } from "@/services/customers/listCustomers";
import { getCustomerFilters } from "@/services/customers/getCustomerFilters";
import { listCustomerGroups } from "@/services/customers/listCustomerGroups";
import { fetchShopsData } from "@/services/shops/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import AddCustomerForm from "@/components/customers/AddCustomerForm";
import CustomerDetailDrawer from "@/components/front-desk/CustomerDetailDrawer";
import CheckInsTable from "./CheckInsTable";
import MergeCustomersDrawer from "./MergeCustomersDrawer";
import BulkUploadDrawer from "./BulkUploadDrawer";
import { useSettings } from "@/context/settings-context";

function formatAge(dob?: string) {
  if (!dob || Number.isNaN(Date.parse(dob))) return null;
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return years > 0 ? `${years}y` : null;
}

export default function CustomersTable() {
  const { defaultPageSize } = useSettings();
  const [mainTab, setMainTab] = useState<"customers" | "checkins">("customers");

  const [filterOptions, setFilterOptions] = useState<{ queryFieldName: string; displayName: string }[]>([]);
  const [selectedFilterField, setSelectedFilterField] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [customerGroupId, setCustomerGroupId] = useState<string>("all");
  const [shops, setShops] = useState<any[]>([]);
  const [scopedShopId, setScopedShopId] = useState<string>("all");
  const [shouldSegmentByShop, setShouldSegmentByShop] = useState(false);
  const [remarksPendingOnly, setRemarksPendingOnly] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);

  const [drawer, setDrawer] = useState<{ open: boolean; customerId: string | null }>({ open: false, customerId: null });
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  useEffect(() => {
    setShouldSegmentByShop(
      JSON.parse(localStorage.getItem("shouldSegmentCustomersBasedOnShopScopes") ?? "false")
    );
    fetchShopsData().then((res) => setShops(res.data || []));
    listCustomerGroups().then((res) => setCustomerGroups(res?.data?.data?.customerGroups || []));
    getCustomerFilters().then((res) => {
      const filters = res?.data?.data?.filters || [];
      const medIdFilter = { queryFieldName: "medLicense", displayName: "Med Id" };
      const hasMedLicense = filters.some((f: any) => f.queryFieldName === "medLicense");
      const allFilters = hasMedLicense ? filters : [...filters, medIdFilter];
      setFilterOptions(allFilters);
      if (allFilters.length) setSelectedFilterField(allFilters[0].queryFieldName);
    });
  }, []);

  const loadCustomers = useCallback(
    async (p = 1, size = pageSize) => {
      setLoading(true);
      try {
        const params: Record<string, any> = { page: p, limit: size, isRemarksPending: remarksPendingOnly };
        if (debouncedSearch.trim()) {
          if (selectedFilterField === "medLicense") {
            params.medLicense = debouncedSearch.trim();
          } else if (selectedFilterField) {
            params.searchFieldName = selectedFilterField;
            params.searchFiledValue = debouncedSearch.trim();
          }
        }
        if (customerGroupId !== "all") params.customerGroupId = customerGroupId;
        if (shouldSegmentByShop && scopedShopId !== "all") params.scopedShopId = scopedShopId;

        const res = await listCustomers(params);
        const data = res?.data?.data;
        setRows(data?.customers || []);
        setPage(data?.paginationData?.currentPage ?? p);
        setTotalEntries(data?.paginationData?.totalEntries ?? 0);
        setTotalPages(data?.paginationData?.totalPages ?? 0);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, selectedFilterField, customerGroupId, scopedShopId, shouldSegmentByShop, remarksPendingOnly, pageSize]
  );

  useEffect(() => {
    if (mainTab === "customers") loadCustomers(1);
  }, [loadCustomers, mainTab]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allSelectedOnPage = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));
  const toggleSelectAllOnPage = () => {
    const pageIds = rows.map((r) => r.id);
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  return (
    <div className="flex gap-4 p-6">
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Customer Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{mainTab === "customers" ? "Customers" : "Check-Ins"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {mainTab === "customers" && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length >= 2 && (
                <Button variant="outline" onClick={() => setMergeOpen(true)}>
                  <Users /> Merge Customers ({selectedIds.length})
                </Button>
              )}
              <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                <Upload /> Bulk Upload
              </Button>
              <Button onClick={() => setDrawer({ open: true, customerId: null })}>
                <Plus /> Add Customer
              </Button>
            </div>
          )}
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "customers" | "checkins")}>
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="checkins">Check-Ins</TabsTrigger>
          </TabsList>
        </Tabs>

        {mainTab === "checkins" ? (
          <CheckInsTable onRowClick={(record) => setDetailId(record.customerId || record.id)} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customers"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {filterOptions.length > 0 && (
                <Select
                  items={filterOptions.map((f) => ({ value: f.queryFieldName, label: f.displayName }))}
                  value={selectedFilterField ?? undefined}
                  onValueChange={setSelectedFilterField}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Search field" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((f) => (
                      <SelectItem key={f.queryFieldName} value={f.queryFieldName}>
                        {f.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                items={[{ value: "all", label: "All Groups" }, ...customerGroups.map((g) => ({ value: g.id, label: g.name }))]}
                value={customerGroupId}
                onValueChange={setCustomerGroupId}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {customerGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {shouldSegmentByShop && (
                <Select
                  items={[{ value: "all", label: "All Shops" }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                  value={scopedShopId}
                  onValueChange={setScopedShopId}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={remarksPendingOnly} onCheckedChange={(c) => setRemarksPendingOnly(!!c)} />
                Pending Remarks
              </label>
            </div>

            <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <TableLoadingOverlay show={loading && rows.length > 0} />
              <Table>
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-10">
                      <Checkbox checked={allSelectedOnPage} onCheckedChange={toggleSelectAllOnPage} />
                    </TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    rows.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow
                        key={`skeleton-${i}`}
                        className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                      >
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                  {!loading && rows.length === 0 && (
                    <TableRow className="border-b-0">
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  )}

                  {rows.map((row, i) => {
                    const age = formatAge(row.dob);
                    const hasPending = row.isCustomerGroupsRemarksPending || row.isCustomerTypeRemarksPending;
                    return (
                      <TableRow
                        key={row.id}
                        data-active={detailId === row.id}
                        className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] data-[active=true]:bg-muted/40 ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                      >
                        <TableCell>
                          <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleSelected(row.id)} />
                        </TableCell>
                        <TableCell className="font-medium">
                          <button onClick={() => setDetailId(row.id)} className="flex cursor-pointer items-center gap-1.5 text-left text-primary hover:underline">
                            {row.firstName}
                            {row.shouldWarnUser && (
                              <AlertTriangle className="size-3.5 text-amber-500" aria-label={row.warningMessage || "Warning"} />
                            )}
                            {hasPending && <span className="text-amber-500">●</span>}
                          </button>
                        </TableCell>
                        <TableCell>{row.lastName || "-"}</TableCell>
                        <TableCell>{row.email || "-"}</TableCell>
                        <TableCell>{age ? `${age} old` : "-"}</TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-block size-2.5 rounded-full ${row.isLocked ? "bg-destructive" : "bg-green-500"}`}
                            title={row.isLocked ? "Customer Disabled" : "Customer Enabled"}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setDrawer({ open: true, customerId: row.id })}
                          >
                            <Pencil />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalEntries > 0 && (
              <TablePagination
                page={page}
                totalPages={totalPages}
                totalEntries={totalEntries}
                pageSize={pageSize}
                loading={loading}
                onPageChange={(p) => loadCustomers(p)}
                pageSizeOptions={[30, 50, 100, 200]}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                  loadCustomers(1, size);
                }}
              />
            )}
          </>
        )}
      </div>

      {detailId && (
        <CustomerDetailDrawer
          open={!!detailId}
          onClose={() => setDetailId(null)}
          customerId={detailId}
          checkedIn={checkedInIds.includes(detailId)}
          onCheckedIn={(id) => setCheckedInIds((prev) => [...prev, id])}
        />
      )}

      <AddCustomerForm
        open={drawer.open}
        customerId={drawer.customerId}
        onClose={() => setDrawer({ open: false, customerId: null })}
        onCreated={() => {
          setDrawer({ open: false, customerId: null });
          loadCustomers(1);
        }}
        onUpdated={() => {
          setDrawer({ open: false, customerId: null });
          loadCustomers(page);
        }}
      />

      <BulkUploadDrawer
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={() => loadCustomers(1)}
      />

      <MergeCustomersDrawer
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        selectedCustomerIds={selectedIds}
        onSuccess={() => {
          setMergeOpen(false);
          setSelectedIds([]);
          loadCustomers(1);
        }}
      />
    </div>
  );
}
