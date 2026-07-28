"use client";

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import { getReturnsList } from "@/services/sales/getReturnsList";
import { getSingleReturn } from "@/services/sales/getSingleReturn";
import { getCustomerFilters } from "@/services/customers/getCustomerFilters";
import { listCustomers } from "@/services/customers/listCustomers";
import { createSaleReturnReport } from "@/services/metrc/createSaleReturnReport";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Drawer from "@/components/ui/Drawer";
import TaxBreakdown from "@/components/pos/TaxBreakdown";
import { TablePagination } from "@/components/ui/table-pagination";

const PAGE_SIZE = 30;

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${String(dt.getMonth() + 1).padStart(2, "0")}.${String(
    dt.getDate()
  ).padStart(2, "0")}.${dt.getFullYear()}`;
};

const num = (v) => Number(v || 0);

const calcPriceAfterDiscount = (item) => {
  const base = num(item?.initialUnitPrice) * num(item?.purchaseQuantity);
  const disc = (item?.discountBreakDownHierarchy || []).reduce(
    (a, d) => a + num(d.totalDiscountApplied),
    0
  );
  return base - disc;
};

const calcFinalPrice = (item, misc) => {
  const base = num(item?.initialUnitPrice) * num(item?.purchaseQuantity);
  const disc = (item?.discountBreakDownHierarchy || []).reduce(
    (a, d) => a + num(d.totalDiscountApplied),
    0
  );
  const tax = (item?.snapShotData?.taxesApplied || []).reduce(
    (a, t) => a + num(t.amount),
    0
  );
  const miscCharges = (misc || []).reduce(
    (a, c) => a + num(c.totalTaxApplied),
    0
  );
  return base - disc + tax + miscCharges;
};

export default function ReturnsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState("Customer");
  const [customersData, setCustomersData] = useState([]);
  const [customerFilterOptions, setCustomerFilterOptions] = useState(null);
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [returnIdSearch, setReturnIdSearch] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [metrcLoadingId, setMetrcLoadingId] = useState(null);

  const requestIdRef = useRef(0);
  const selectedCustomer = useSelector(
    (state: any) => state?.customer?.selectedCustomer
  );

  const filterOptions = [
    { queryFieldName: "Customer", displayName: "Customer" },
    { queryFieldName: "ReturnId", displayName: "Return ID" },
  ];

  // One-way sync from a POS-selected customer.
  useEffect(() => {
    if (selectedCustomer?.id) {
      setSelectedFilter("Customer");
      setSelectedCustomerId(selectedCustomer.id);
      setSearchTrigger((p) => p + 1);
    } else {
      setSelectedCustomerId(null);
      setSearchTrigger((p) => p + 1);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    getCustomerFilters().then((res) => {
      const filters = res?.data?.data?.filters;
      setCustomerFilterOptions(filters);
      if (filters?.length) setSelectedCustomerFilter(filters[0].queryFieldName);
    });
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomers = async (queryParams = {}) => {
    try {
      const res = await listCustomers(queryParams);
      setCustomersData(res?.data?.data?.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);
    fetchCustomers({
      searchFieldName: selectedCustomerFilter || undefined,
      searchFiledValue: value || undefined,
    });
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerId(null);
    setCustomerSearch("");
    fetchCustomers({ limit: 100, page: 1 });
  };

  // Filter changes reset to page 1.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId, returnIdSearch, searchTrigger]);

  useEffect(() => {
    const filters: { name: string; value: any }[] = [
      { name: "limit", value: PAGE_SIZE },
      { name: "page", value: page },
    ];
    if (selectedCustomerId)
      filters.push({ name: "customerId", value: selectedCustomerId });
    if (returnIdSearch)
      filters.push({ name: "advertisedSaleReturnId", value: returnIdSearch });
    fetchReturns(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId, returnIdSearch, searchTrigger, page]);

  const fetchReturns = async (filters) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await getReturnsList(filters);
      if (requestId !== requestIdRef.current) return;
      setData(res?.data?.data?.saleReturns || []);
      const pagination = res?.data?.data?.paginationData;
      setTotalPages(pagination?.totalPages || 1);
      setTotalEntries(pagination?.totalEntries || 0);
    } catch (error) {
      if (requestId === requestIdRef.current)
        toast.error(error?.message || "Failed to load returns");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const openDetail = async (record) => {
    const shopId =
      record?.shopId || JSON.parse(localStorage.getItem("shopId"));
    if (!shopId) return;
    setDetailOpen(true);
    setSelectedOrderDetails(null);
    setDetailLoading(true);
    try {
      const res = await getSingleReturn(shopId, record.id);
      setSelectedOrderDetails(res?.data?.data?.saleReturn || null);
    } catch (error) {
      toast.error(error?.message || "Failed to load return");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // METRC: report a sale-return. Preserved from the old flow.
  const handleSubmitReporting = async (record) => {
    setMetrcLoadingId(record.id);
    try {
      await createSaleReturnReport({
        shopId: JSON.parse(localStorage.getItem("shopId")),
        id: record.id,
      });
      toast.success("This sale has been reported to metrc successfully");
      fetchReturns([
        { name: "limit", value: PAGE_SIZE },
        { name: "page", value: page },
        ...(selectedCustomerId
          ? [{ name: "customerId", value: selectedCustomerId }]
          : []),
        ...(returnIdSearch
          ? [{ name: "advertisedSaleReturnId", value: returnIdSearch }]
          : []),
      ]);
    } catch (error) {
      toast.error(error?.message || "Error");
    } finally {
      setMetrcLoadingId(null);
    }
  };

  const ReportingStatusCell = ({ record }) => {
    if (!record.isReportingApplicable) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    const loading = metrcLoadingId === record.id;
    switch (record.reportingStatus) {
      case "SUCCESS":
        return (
          <span className="rounded bg-teal-100 px-3 py-1 text-xs text-teal-600">
            Completed
          </span>
        );
      case "PENDING":
        return (
          <button
            type="button"
            title="Click to submit for reporting"
            disabled={loading}
            onClick={() => handleSubmitReporting(record)}
            className="rounded bg-amber-100 px-3 py-1 text-xs text-amber-600"
          >
            {loading ? "…" : "Pending"}
          </button>
        );
      case "FAILED":
        return (
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="rounded bg-red-600 px-3 py-1 text-xs text-white"
                >
                  Error
                </button>
              }
            />
            <PopoverContent className="w-72">
              <div className="text-sm">{record.reportingErrorMessage}</div>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabled={loading}
                  onClick={() => handleSubmitReporting(record)}
                >
                  {loading ? "Submitting…" : "Submit for Reporting"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        );
      default:
        return (
          <span className="rounded bg-gray-400 px-3 py-1 text-xs text-white">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className={detailOpen ? "w-full lg:w-3/5" : "w-full"}>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Select
              value={selectedFilter}
              onValueChange={(value) => {
                setSelectedFilter(value);
                if (value !== "Customer") clearCustomerSelection();
                else setReturnIdSearch("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((o) => (
                  <SelectItem key={o.queryFieldName} value={o.queryFieldName}>
                    {o.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFilter === "Customer" ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-52">
                <Select
                  value={selectedCustomerId ? String(selectedCustomerId) : ""}
                  onValueChange={(v) => setSelectedCustomerId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer">
                      {(value) => {
                        const c = customersData.find(
                          (item) => String(item.id) === value
                        );
                        return c
                          ? `${c.firstName} ${c.lastName}`
                          : "Select Customer";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {customersData.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Search Customer"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                className="w-44"
              />
              {customerFilterOptions && (
                <div className="w-32">
                  <Select
                    value={selectedCustomerFilter ?? ""}
                    onValueChange={setSelectedCustomerFilter}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customerFilterOptions.map((o) => (
                        <SelectItem
                          key={o.queryFieldName}
                          value={o.queryFieldName}
                        >
                          {o.displayName === "First Name"
                            ? "Name"
                            : o.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedCustomerId && (
                <Button variant="outline" onClick={clearCustomerSelection}>
                  Clear
                </Button>
              )}
            </div>
          ) : (
            <Input
              placeholder="Search Return ID..."
              value={returnIdSearch}
              onChange={(e) => setReturnIdSearch(e.target.value)}
              className="w-56"
            />
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Return ID</th>
                <th className="px-4 py-2 font-medium">Sale ID</th>
                <th className="px-4 py-2 font-medium">Reporting Status</th>
                <th className="px-4 py-2 font-medium">Customer Name</th>
                <th className="px-4 py-2 font-medium">Return Total $</th>
                <th className="px-4 py-2 font-medium">Return Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No returns found
                  </td>
                </tr>
              ) : (
                data.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => openDetail(record)}
                      >
                        {record.advertisedId}
                      </button>
                    </td>
                    <td className="px-4 py-2">{record.advertisedSaleId}</td>
                    <td className="px-4 py-2">
                      <ReportingStatusCell record={record} />
                    </td>
                    <td className="px-4 py-2">
                      {record.customerInfo
                        ? `${record.customerInfo.firstName ?? ""} ${
                            record.customerInfo.lastName ?? ""
                          }`.trim() || "-"
                        : "-"}
                    </td>
                    <td className="px-4 py-2">
                      $ {record.finalPayable ?? "-"}
                    </td>
                    <td className="px-4 py-2">{fmtDate(record.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalEntries={totalEntries}
            pageSize={PAGE_SIZE}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedOrderDetails(null);
        }}
        side="right"
        size={520}
        className="overflow-auto"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">
              Return # {selectedOrderDetails?.advertisedId ?? ""}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailOpen(false)}
            >
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {detailLoading ? (
              <div className="py-24 text-center text-muted-foreground">
                Loading…
              </div>
            ) : selectedOrderDetails ? (
              <ReturnDetail order={selectedOrderDetails} />
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex w-full items-center justify-between py-0.5">
      <span className="flex-1 font-medium">{label}</span>
      <span className="flex-1 truncate text-right">{value}</span>
    </div>
  );
}

function ReturnDetail({ order }) {
  const misc = order?.miscCharges || [];
  const storeLabel =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("shopDetails") || "null")?.label) ||
    "-";

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-lg border border-border">
        <div className="rounded-t-lg bg-[rgb(89,135,216)] px-3 py-2 text-white">
          <h6 className="m-0 font-semibold">Returns</h6>
        </div>
        <div className="space-y-0.5 px-4 py-3 text-sm">
          <Row label="Type" value="SALE" />
          <Row label="Created At" value={fmtDate(order?.createdAt)} />
          <Row label="Completed At" value={fmtDate(order?.placedAtISO)} />
          <Row
            label="Customer"
            value={`${order?.customer?.firstName ?? "-"} ${
              order?.customer?.lastName ?? "-"
            }`}
          />
          <Row label="Store" value={storeLabel} />
          <Row label="Customer Type" value={order?.customerType?.name ?? "-"} />
          <Row label="Employee" value={order?.creatorInfo?.name ?? "-"} />
        </div>
      </div>

      {order?.receiptNote && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <div className="font-semibold">Note</div>
          <div>{order.receiptNote}</div>
        </div>
      )}

      {/* Return items */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-3 py-2 font-medium">
          Return Items
        </div>
        <div className="divide-y divide-border">
          {(order?.nonPackagedLineItems || []).map((item, index) => (
            <div key={index} className="p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="mb-2 font-medium">
                    {item?.snapShotData?.productName}{" "}
                    <span className="text-muted-foreground">
                      ({item?.snapShotData?.advertisedPackageId})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Quantity:{" "}
                    {item?.snapShotData?.displayQtyConversionRateUsed > 0
                      ? `${item?.purchaseQuantity} ${
                          item?.snapShotData?.purchaseUoMShortForm || "ea"
                        } (${(
                          num(item?.purchaseQuantity) /
                          item?.snapShotData?.displayQtyConversionRateUsed
                        ).toFixed(2)} ${
                          item?.snapShotData?.displayQtyShortForm
                        }) x $${item?.initialUnitPrice} = $${(
                          num(item?.purchaseQuantity) *
                          num(item?.initialUnitPrice)
                        ).toFixed(2)}`
                      : `${item?.purchaseQuantity} x $${
                          item?.initialUnitPrice
                        } = $${(
                          num(item?.purchaseQuantity) *
                          num(item?.initialUnitPrice)
                        ).toFixed(2)}`}
                  </div>
                </div>
                <div className="font-semibold">
                  ${calcFinalPrice(item, misc).toFixed(2)}
                </div>
              </div>

              {/* Discounts */}
              {(item?.discountBreakDownHierarchy || []).map((discount, i) =>
                ["DEAL", "COUPON", "LOYALTY_POINTS"].includes(
                  discount.source
                ) ? (
                  <div
                    key={i}
                    className="mt-1 flex justify-between text-[#767676]"
                  >
                    <span>
                      {discount.notes} (
                      {discount.discountRateType === "PERCENTAGE"
                        ? `${discount.discountRate}%`
                        : `$${discount.discountRate}`}
                      )
                    </span>
                    <span className="text-red-500">
                      - ${discount.totalDiscountApplied}
                    </span>
                  </div>
                ) : null
              )}

              {item?.discountBreakDownHierarchy?.length > 0 && (
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Price After Discount</span>
                  <span>${calcPriceAfterDiscount(item).toFixed(2)}</span>
                </div>
              )}

              <TaxBreakdown product={item.snapShotData} />

              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                <span>Price After Taxes</span>
                <span>${calcFinalPrice(item, misc).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-border px-4 py-2 font-semibold">
          <span>Total</span>
          <span>${order?.finalSubTotal}</span>
        </div>
      </div>

      {/* MJ items */}
      <div className="rounded-lg border border-border p-3 text-sm">
        <div>
          Patient License Number:{" "}
          {order?.customer?.mjMedicalData?.medicalLicense ?? "-"}
        </div>
        <div className="font-semibold">
          {order?.nonPackagedLineItems?.length} MJ Items Sold
        </div>
      </div>
    </div>
  );
}
