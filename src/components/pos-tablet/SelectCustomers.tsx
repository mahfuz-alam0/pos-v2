"use client";

import { useEffect, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { listCustomers } from "@/services/customers/listCustomers";
import { getCustomerFilters } from "@/services/customers/getCustomerFilters";

/**
 * Full-screen customer-search overlay for POS Tablet mode. Ported from the
 * inline `CustSearchOverlay` card grid in old routes/Pos/TabletPos/index.js
 * (the polished card-grid variant that the "Search Customer" pill actually
 * opened; the legacy PosTabletMode/SelectCustomers.js table version is dead).
 *
 * Self-contained search surface — it owns the customer list + filter fetch and
 * hands the chosen customer back via `onSelect(customer)`. All customer-select
 * business logic (quote refresh, default group, auto-queue) stays on the page.
 *
 * Props: open, onClose, onSelect(customer)
 */
export default function SelectCustomers({ open, onClose, onSelect }) {
  const [customersData, setCustomersData] = useState([]);
  const [filterOptions, setFilterOptions] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchDebouncing, setSearchDebouncing] = useState(false);
  // null = All Shops, shopId = This Shop only. Defaults to This Shop.
  const [scopedShopId, setScopedShopId] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("shopId"));
    } catch {
      return null;
    }
  });

  const shouldSegmentByShop =
    typeof window !== "undefined" &&
    JSON.parse(
      localStorage.getItem("shouldSegmentCustomersBasedOnShopScopes") ?? "false"
    );

  const searchDebounceRef = useRef(null);

  const fetchCustomers = (queryParams: any = {}) => {
    setLoading(true);
    const params: any = { ...queryParams };
    if (scopedShopId) params.scopedShopId = scopedShopId;
    listCustomers(params)
      .then((res) => setCustomersData(res?.data?.data?.customers || []))
      .catch((err) => console.error("Error fetching customers:", err))
      .finally(() => setLoading(false));
  };

  // Load filters + initial list when the overlay opens.
  useEffect(() => {
    if (!open) return;
    getCustomerFilters()
      .then((res) => {
        const filters = res.data.data.filters || [];
        const hasMed = filters.some((f) => f.queryFieldName === "medLicense");
        const all = hasMed
          ? filters
          : [...filters, { queryFieldName: "medLicense", displayName: "Med Id" }];
        setFilterOptions(all);
        if (all.length) setSelectedFilter(all[0].queryFieldName);
      })
      .catch(() => {});
    setSearchValue("");
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-fetch when the This Shop / All Shops scope toggles (effect avoids reading
  // a stale scopedShopId out of the toggle's closure).
  useEffect(() => {
    if (open) fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedShopId]);

  const handleSearch = (value) => {
    setSearchValue(value);
    clearTimeout(searchDebounceRef.current);
    if (!value) {
      setSearchDebouncing(false);
      fetchCustomers();
      return;
    }
    setSearchDebouncing(true);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebouncing(false);
      const params: any = {};
      if (selectedFilter === "medLicense") {
        params.medLicense = value.trim();
      } else {
        params.searchFieldName = selectedFilter;
        params.searchFiledValue = value;
      }
      fetchCustomers(params);
    }, 500);
  };

  const handleClose = () => {
    clearTimeout(searchDebounceRef.current);
    setSearchDebouncing(false);
    setSearchValue("");
    onClose?.();
  };

  const handleSelect = (customer) => {
    onSelect?.(customer);
    handleClose();
  };

  if (!open) return null;

  const activeFilterName =
    (filterOptions || []).find((f) => f.queryFieldName === selectedFilter)
      ?.displayName || "name";

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 shadow-sm md:px-7">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold leading-tight">
              Search Customer
            </div>
            <div className="text-xs text-muted-foreground">
              Select a customer to attach to this order
            </div>
          </div>
        </div>

        <div className="relative flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search by ${
              activeFilterName === "First Name" ? "Name" : activeFilterName
            }…`}
            className="h-11 pl-9"
          />
          {(searchDebouncing || loading) && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">
              searching…
            </span>
          )}
        </div>

        <Select
          value={selectedFilter ?? ""}
          onValueChange={(val) => {
            setSelectedFilter(val);
            setSearchValue("");
            setSearchDebouncing(false);
            fetchCustomers();
          }}
        >
          <SelectTrigger className="h-11 w-36">
            <SelectValue placeholder="Filter">
              {() => {
                const match = (filterOptions || []).find(
                  (o) => o.queryFieldName === selectedFilter
                );
                if (!match) return "Filter";
                return match.displayName === "First Name"
                  ? "Name"
                  : match.displayName;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(filterOptions || []).map((opt) => (
              <SelectItem key={opt.queryFieldName} value={opt.queryFieldName}>
                {opt.displayName === "First Name" ? "Name" : opt.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {shouldSegmentByShop && (
          <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
            <button
              type="button"
              className={`h-11 px-3 text-sm ${
                scopedShopId
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground"
              }`}
              onClick={() => {
                try {
                  setScopedShopId(JSON.parse(localStorage.getItem("shopId")));
                } catch {
                  setScopedShopId(null);
                }
                setSearchValue("");
                setSearchDebouncing(false);
                clearTimeout(searchDebounceRef.current);
              }}
            >
              This Shop
            </button>
            <button
              type="button"
              className={`h-11 px-3 text-sm ${
                !scopedShopId
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground"
              }`}
              onClick={() => {
                setScopedShopId(null);
                setSearchValue("");
                setSearchDebouncing(false);
                clearTimeout(searchDebounceRef.current);
              }}
            >
              All Shops
            </button>
          </div>
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            Searching customers…
          </div>
        ) : customersData.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <User className="mx-auto mb-4 h-12 w-12 opacity-40" />
            <div className="text-base font-semibold">No customers found</div>
            <div className="mt-1 text-sm">
              Try a different search term or filter
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {customersData.length} result
              {customersData.length !== 1 ? "s" : ""}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
              {customersData.map((customer) => {
                const dobValue = customer.dateOfBirth || customer.dob;
                let age = null;
                if (dobValue) {
                  const today = new Date();
                  const birth = new Date(dobValue);
                  age = today.getFullYear() - birth.getFullYear();
                  const m = today.getMonth() - birth.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birth.getDate()))
                    age--;
                }
                return (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-bold text-primary-foreground">
                      {customer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={customer.avatarUrl}
                          alt=""
                          className="h-14 w-14 object-cover"
                        />
                      ) : (
                        (customer.firstName || "?")[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold">
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {customer.customerType && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {customer.customerType}
                          </span>
                        )}
                        {age !== null && age > 0 && (
                          <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Age {age}
                          </span>
                        )}
                      </div>
                      {customer.phone && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          📞 {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {customer.email}
                        </div>
                      )}
                    </div>
                    <Button
                      className="h-11 shrink-0"
                      onClick={() => handleSelect(customer)}
                    >
                      Select
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
