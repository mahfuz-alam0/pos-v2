"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { listSales } from "@/services/sales/listSales";
import { getSingleSale } from "@/services/sales/getSingleSales";
import { getCustomerFilters } from "@/services/customers/getCustomerFilters";
import { listCustomers } from "@/services/customers/listCustomers";
import { createSaleReport } from "@/services/metrc/createSaleReport";

import { getSaleDetail, resetSaleDetail } from "@/store/slices/saleDataSlice";
import { updateOrderAction } from "@/store/slices/orderActionSlice";

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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Drawer from "@/components/ui/Drawer";
import TaxBreakdown from "@/components/pos/TaxBreakdown";
import PrintOrderModal from "@/components/order-ahead/PrintOrderModal";

const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const num = (v) => Number(v || 0);

const STATUS_STYLES = {
  Completed: "bg-teal-100 text-teal-600",
  "Packaged & Ready": "bg-teal-100 text-teal-600",
  Processing: "bg-amber-100 text-amber-600",
  Cancelled: "bg-red-100 text-red-500",
  "Out for Delivery": "bg-blue-100 text-blue-600",
  "Awaiting Driver": "bg-purple-100 text-purple-600",
};

// Date-range presets. Returns { fromDate, toDate } as YYYY-MM-DD or nulls.
const iso = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;

function getDateRange(preset, custom) {
  const now = new Date();
  switch (preset) {
    case "Today":
      return { fromDate: iso(now), toDate: iso(now) };
    case "Yesterday": {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return { fromDate: iso(y), toDate: iso(y) };
    }
    case "Last 7 days": {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
      return { fromDate: iso(s), toDate: iso(now) };
    }
    case "Last 15 days": {
      const s = new Date(now);
      s.setDate(now.getDate() - 15);
      return { fromDate: iso(s), toDate: iso(now) };
    }
    case "Last month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { fromDate: iso(s), toDate: iso(e) };
    }
    case "Custom range":
      if (custom[0] && custom[1])
        return { fromDate: custom[0], toDate: custom[1] };
      return { fromDate: null, toDate: null };
    default:
      return { fromDate: null, toDate: null };
  }
}

const ONLINE_PAYMENT_METHOD_LABELS = {
  CASHLESS_ATM: "Cashless ATM",
  ACH: "ACH",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
};

const getTransactionLabel = (txn) => {
  const base = (() => {
    if (txn?.method === "CASH") return "Cash";
    if (txn?.method === "VIRTUAL")
      return (
        ONLINE_PAYMENT_METHOD_LABELS[txn?.onlinePaymentMethod] ||
        "Online Payment"
      );
    if (txn?.type === "STORE_CREDIT" || txn?.method === "STORE_CREDIT")
      return "Store Credit";
    return txn?.method || "Payment";
  })();
  return txn?.type === "DEBIT" ? `${base} Returned` : base;
};

export default function InProgressOrders({
  switchTab,
  isActive = true,
  onRefresh,
}) {
  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paginationData, setPaginationData] = useState({
    limit: 30,
    page: 1,
    totalEntries: 0,
    totalPages: 0,
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState("Customer");
  const [customersData, setCustomersData] = useState([]);
  const [customerFilterOptions, setCustomerFilterOptions] = useState(null);
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [selectedReportingStatus, setSelectedReportingStatus] = useState("");
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("All");
  const [customDateRange, setCustomDateRange] = useState(["", ""]);
  const [reportingLoadingId, setReportingLoadingId] = useState(null);

  const isLoadingRef = useRef(false);
  const pendingFiltersRef = useRef(null);
  const hasInitiallyLoaded = useRef(false);
  const lastOrderAction = useRef(null);

  const orderAction = useSelector(
    (state: any) => state?.orderAction?.orderAction,
  );
  const selectedCustomer = useSelector(
    (state: any) => state?.customer?.selectedCustomer,
  );

  const buildFilters = useCallback(
    (page = 1) => {
      const filters: { name: string; value: any }[] = [
        { name: "limit", value: paginationData.limit || 30 },
        { name: "page", value: page },
      ];
      if (selectedCustomerId)
        filters.push({ name: "customerId", value: selectedCustomerId });
      if (orderIdSearch)
        filters.push({ name: "advertisedSaleId", value: orderIdSearch });
      if (selectedReportingStatus)
        filters.push({
          name: "reportingStatus",
          value: selectedReportingStatus,
        });
      if (selectedDeliveryMethod)
        filters.push({ name: "deliveryMethod", value: selectedDeliveryMethod });
      const dateRange = getDateRange(selectedDateFilter, customDateRange);
      if (dateRange.fromDate && dateRange.toDate) {
        filters.push({ name: "fromDate", value: dateRange.fromDate });
        filters.push({ name: "toDate", value: dateRange.toDate });
      }
      return filters;
    },
    [
      paginationData.limit,
      selectedCustomerId,
      orderIdSearch,
      selectedReportingStatus,
      selectedDeliveryMethod,
      selectedDateFilter,
      customDateRange,
    ],
  );

  const fetchOrders = useCallback((filters) => {
    return new Promise((resolve, reject) => {
      if (isLoadingRef.current) {
        pendingFiltersRef.current = filters;
        resolve({ skipped: true });
        return;
      }
      isLoadingRef.current = true;
      setLoading(true);
      listSales(filters)
        .then((res) => {
          const sales = res?.data?.data?.sales || [];
          setData(sales);
          const pg = res?.data?.data?.paginationData;
          if (pg)
            setPaginationData({
              limit: pg.limit,
              page: pg.currentPage,
              totalEntries: pg.totalEntries,
              totalPages: pg.totalPages,
            });
          setLoading(false);
          isLoadingRef.current = false;
          if (pendingFiltersRef.current) {
            const pf = pendingFiltersRef.current;
            pendingFiltersRef.current = null;
            fetchOrders(pf).catch(() => {});
          }
          resolve(res?.data);
        })
        .catch((error) => {
          setLoading(false);
          isLoadingRef.current = false;
          pendingFiltersRef.current = null;
          reject(error);
        });
    });
  }, []);

  // Customer filter options + initial customers
  useEffect(() => {
    getCustomerFilters().then((res) => {
      const filters = res?.data?.data?.filters;
      setCustomerFilterOptions(filters);
      if (filters?.length) setSelectedCustomerFilter(filters[0].queryFieldName);
    });
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-way sync from a POS-selected customer.
  useEffect(() => {
    if (selectedCustomer?.id) {
      setSelectedFilter("Customer");
      setSelectedCustomerId(selectedCustomer.id);
      setCustomersData((prev) =>
        prev.some((c) => c.id === selectedCustomer.id)
          ? prev
          : [selectedCustomer, ...prev],
      );
    }
  }, [selectedCustomer?.id]);

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

  // Filter-driven fetch
  useEffect(() => {
    fetchOrders(buildFilters(1)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildFilters]);

  // Refresh when the tab becomes active (skip the very first activation).
  useEffect(() => {
    if (isActive && hasInitiallyLoaded.current) {
      fetchOrders(buildFilters(1)).catch(() => {});
    } else if (isActive) {
      hasInitiallyLoaded.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Refresh when a new order is created elsewhere.
  useEffect(() => {
    if (
      (orderAction === "orderCreated" || orderAction === "newOrder") &&
      lastOrderAction.current !== orderAction
    ) {
      lastOrderAction.current = orderAction;
      setTimeout(() => fetchOrders(buildFilters(1)).catch(() => {}), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderAction]);

  const refreshOrdersData = useCallback(() => {
    return fetchOrders(buildFilters(paginationData.page || 1)).catch(() => {});
  }, [fetchOrders, buildFilters, paginationData.page]);

  // Expose refresh to parent.
  useEffect(() => {
    if (typeof onRefresh === "function") onRefresh(refreshOrdersData);
  }, [onRefresh, refreshOrdersData]);

  // Refresh when the browser tab regains visibility.
  useEffect(() => {
    let t;
    const onVisibility = () => {
      if (!document.hidden && isActive) {
        clearTimeout(t);
        t = setTimeout(() => refreshOrdersData(), 1000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(t);
    };
  }, [isActive, refreshOrdersData]);

  const openDetail = async (record) => {
    setDetailOpen(true);
    setDetailOrder(null);
    try {
      const res = await getSingleSale(record.id);
      setDetailOrder(res?.data?.data?.sale || null);
    } catch (error) {
      toast.error(error?.message || "Failed to load order");
    }
  };

  const processFlow = async (record, action) => {
    dispatch(resetSaleDetail());
    try {
      const res = await getSingleSale(record.id);
      const saleData = res?.data?.data?.sale;
      dispatch(getSaleDetail(saleData));
      dispatch(updateOrderAction(action));
      switchTab("1");
    } catch (error) {
      toast.error(error?.message || "Failed to load order");
    }
  };

  // METRC: report a completed sale. Preserved from the old flow.
  const createSaleReportFor = async (saleId) => {
    setReportingLoadingId(saleId);
    try {
      const res = await createSaleReport({
        shopId: JSON.parse(localStorage.getItem("shopId")),
        id: saleId,
      });
      if (res?.data?.success) {
        toast.success("METRC sale report created successfully");
        refreshOrdersData();
      }
    } catch (error) {
      toast.error(error?.message || "Failed to create METRC sale report");
    } finally {
      setReportingLoadingId(null);
    }
  };

  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > (paginationData.totalPages || 1)) return;
    fetchOrders(buildFilters(nextPage)).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className={detailOpen ? "w-full lg:w-3/5" : "w-full"}>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="w-32">
            <Select
              value={selectedFilter}
              onValueChange={(value) => {
                setSelectedFilter(value);
                if (value !== "Customer") clearCustomerSelection();
              }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="OrderId">Order ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedFilter === "Customer" ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-48">
                <Select
                  value={selectedCustomerId ? String(selectedCustomerId) : ""}
                  onValueChange={(v) => setSelectedCustomerId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer">
                      {(value) => {
                        const c = customersData.find(
                          (item) => String(item.id) === value,
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
                className="w-40"
              />
              {customerFilterOptions && (
                <div className="w-28">
                  <Select
                    value={selectedCustomerFilter ?? ""}
                    onValueChange={setSelectedCustomerFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customerFilterOptions.map((o) => (
                        <SelectItem
                          key={o.queryFieldName}
                          value={o.queryFieldName}>
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
              placeholder="Search Order ID..."
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              className="w-48"
            />
          )}

          <div className="w-36">
            <Select
              value={selectedReportingStatus || "__all__"}
              onValueChange={(v) =>
                setSelectedReportingStatus(v === "__all__" ? "" : v)
              }>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Reporting Status">
                  {(value) => {
                    const labels = {
                      __all__: "All Reporting",
                      SUCCESS: "Success",
                      PENDING: "Pending",
                      FAILED: "Failed",
                    };
                    return labels[value] || "Reporting Status";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Reporting</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={selectedDeliveryMethod || "__all__"}
              onValueChange={(v) =>
                setSelectedDeliveryMethod(v === "__all__" ? "" : v)
              }>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Order Type">
                  {(value) => {
                    const labels = {
                      __all__: "All Order Types",
                      IN_STORE: "In Store",
                      PICK_UP: "Pick Up",
                      DELIVERY: "Delivery",
                    };
                    return labels[value] || "Order Type";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Order Types</SelectItem>
                <SelectItem value="IN_STORE">In Store</SelectItem>
                <SelectItem value="PICK_UP">Pick Up</SelectItem>
                <SelectItem value="DELIVERY">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={selectedDateFilter}
              onValueChange={setSelectedDateFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Dates</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="Yesterday">Yesterday</SelectItem>
                <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                <SelectItem value="Last 15 days">Last 15 days</SelectItem>
                <SelectItem value="Last month">Last month</SelectItem>
                <SelectItem value="Custom range">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedDateFilter === "Custom range" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customDateRange[0]}
                onChange={(e) =>
                  setCustomDateRange([e.target.value, customDateRange[1]])
                }
                className="w-40"
              />
              <Input
                type="date"
                value={customDateRange[1]}
                onChange={(e) =>
                  setCustomDateRange([customDateRange[0], e.target.value])
                }
                className="w-40"
              />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Order ID</th>
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">Team</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                <th className="px-3 py-2 text-center font-medium">
                  Order Type
                </th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 text-center font-medium">Reporting</th>
                <th className="px-3 py-2 text-center font-medium">Total</th>
                <th className="px-3 py-2 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                data.map((record) => {
                  const statusName = record?.status?.displayName;
                  const showProcess =
                    (statusName === "Processing" ||
                      statusName === "Packaged & Ready") &&
                    !(
                      record?.deliveryMethod === "DELIVERY" &&
                      record?.status?.isAssociatedWithInventoryDeduction
                    );
                  const showRefund = statusName === "Completed";
                  return (
                    <tr key={record.id}>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => openDetail(record)}>
                          {record.advertisedId}
                        </button>
                      </td>
                      <td className="max-w-40 truncate px-3 py-2">
                        {`${record?.customerInfo?.firstName ?? ""} ${
                          record?.customerInfo?.lastName ?? ""
                        }`.trim() || "-"}
                      </td>
                      <td className="max-w-35 truncate px-3 py-2">
                        {record?.employeeInfo?.name || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {fmtDateTime(record.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            STATUS_STYLES[statusName] ||
                            "bg-amber-100 text-amber-600"
                          }`}>
                          {statusName === "Packaged & Ready"
                            ? "P&R"
                            : statusName}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {record?.deliveryMethod?.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            record?.paymentStatus === "PAID_IN_FULL"
                              ? "bg-teal-100 text-teal-600"
                              : "bg-amber-100 text-amber-600"
                          }`}>
                          {record?.paymentStatus === "PAID_IN_FULL"
                            ? "Completed"
                            : "Pending"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                disabled={
                                  statusName !== "Completed" ||
                                  reportingLoadingId === record.id
                                }
                                onClick={() => {
                                  if (statusName === "Completed")
                                    createSaleReportFor(record.id);
                                }}
                                className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                                  record?.reportingStatus === "SUCCESS"
                                    ? "bg-teal-100 text-teal-600"
                                    : record?.reportingStatus === "PENDING"
                                      ? "bg-amber-100 text-amber-600"
                                      : record?.reportingStatus === "FAILED"
                                        ? "bg-red-100 text-red-500"
                                        : "bg-muted text-muted-foreground"
                                }`}>
                                {reportingLoadingId === record.id
                                  ? "…"
                                  : record?.reportingStatus || "N/A"}
                              </button>
                            }
                          />
                          <TooltipContent>
                            {statusName === "Completed"
                              ? "Click to create METRC sale report"
                              : "Only available for completed orders"}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2 text-center">
                        ${record.finalPayable}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {showProcess ? (
                          <Button
                            size="xs"
                            onClick={() => processFlow(record, "processOrder")}>
                            Process
                          </Button>
                        ) : showRefund ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              processFlow(record, "processReturns")
                            }>
                            Refund
                          </Button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {paginationData.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <span className="text-muted-foreground">
              Page {paginationData.page} of {paginationData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={paginationData.page <= 1}
              onClick={() => changePage(paginationData.page - 1)}>
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={paginationData.page >= paginationData.totalPages}
              onClick={() => changePage(paginationData.page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailOrder(null);
        }}
        side="right"
        size={540}
        className="overflow-auto">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">
              Order # {detailOrder?.advertisedId ?? ""}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!detailOrder}
                onClick={() => setPrintOpen(true)}>
                Print Invoice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {detailOrder ? (
              <OrderDetail order={detailOrder} />
            ) : (
              <div className="py-24 text-center text-muted-foreground">
                Loading…
              </div>
            )}
          </div>
        </div>
      </Drawer>

      <PrintOrderModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        type="sale"
        item={detailOrder}
      />
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

// Aggregates each line item's own taxesApplied (see TaxBreakdown.tsx) across
// every non-packaged and packaged/BOGO item in the order, summing same-named
// taxes into one total each — the per-item breakdowns only show what applied
// to that one line, not the sale-wide total for e.g. "Excise Tax".
function aggregateOrderTaxes(order) {
  const rateByName: Record<string, number> = {};
  const totalByName: Record<string, number> = {};

  const collectFrom = (product) => {
    if (!product?.taxesApplied?.length) return;
    (product.taxProfileSnapShot?.taxes || []).forEach((tp) => {
      if (rateByName[tp.taxName] == null) rateByName[tp.taxName] = tp.taxRate;
    });
    product.taxesApplied.forEach((t) => {
      totalByName[t.name] = (totalByName[t.name] || 0) + num(t.amount);
    });
  };

  (order?.nonPackagedLineItems || []).forEach((item) =>
    collectFrom(item?.snapShotData),
  );
  (order?.packagedLineItems || []).forEach((pkg) => {
    [...(pkg.parentLineItems || []), ...(pkg.childLineItems || [])].forEach(
      (it) => {
        collectFrom((it.createdLineItem || it)?.snapShotData);
      },
    );
  });

  return Object.entries(totalByName).map(([name, amount]) => ({
    name,
    amount,
    rate: rateByName[name],
  }));
}

function OrderDetail({ order }) {
  const misc = order?.miscCharges || [];
  const storeLabel =
    (typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("shopDetails") || "null")?.label) ||
    "-";
  const transactions = order?.transactions || [];
  const received = transactions
    .filter((t) => t.type === "CREDIT")
    .reduce((s, t) => s + num(t.amount), 0);
  const changeDue = transactions
    .filter((t) => t.type === "DEBIT")
    .reduce((s, t) => s + num(t.amount), 0);
  const taxRows = aggregateOrderTaxes(order);
  const taxTotal = taxRows.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4 text-sm">
      {/* Header info */}
      <div className="rounded-lg border border-border">
        <div className="rounded-t-lg bg-[rgb(89,135,216)] px-3 py-2 text-white">
          <h6 className="m-0 font-semibold">
            {order?.status?.displayName ?? "-"}
          </h6>
        </div>
        <div className="space-y-0.5 px-4 py-3">
          <Row label="Type" value="SALE" />
          <Row label="Created At" value={fmtDateTime(order?.createdAt)} />
          <Row label="Completed At" value={fmtDateTime(order?.placedAtISO)} />
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
        <div className="rounded-lg border border-border p-3">
          <div className="font-semibold">Note</div>
          <div>{order.receiptNote}</div>
        </div>
      )}

      {/* Non-packaged line items */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-3 py-2 font-medium">
          Order Items
        </div>
        <div className="divide-y divide-border">
          {(order?.nonPackagedLineItems || []).map((item, index) => (
            <div key={index} className="p-3">
              <div className="flex justify-between">
                <div>
                  <div className="mb-1 font-medium">
                    {item?.snapShotData?.productName}{" "}
                    <span className="text-muted-foreground">
                      ({item?.snapShotData?.advertisedPackageId})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Quantity: {item?.purchaseQuantity} x $
                    {item?.initialUnitPrice} = $
                    {(
                      num(item?.purchaseQuantity) * num(item?.initialUnitPrice)
                    ).toFixed(2)}
                  </div>
                </div>
                <div className="font-semibold">
                  ${num(item?.totalPriceBeforeTax).toFixed(2)}
                </div>
              </div>

              {(item?.discountBreakDownHierarchy || []).map((discount, i) => (
                <div
                  key={i}
                  className="mt-1 flex justify-between text-[#767676]">
                  <span>
                    {discount.notes} (
                    {discount.discountRateType === "PERCENTAGE"
                      ? `${discount.discountRate}%`
                      : `$${discount.discountRate}`}
                    )
                  </span>
                  <span className="text-red-500">
                    - ${num(discount.totalDiscountApplied).toFixed(2)}
                  </span>
                </div>
              ))}

              <TaxBreakdown product={item.snapShotData} />

              <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                <span>Price After Taxes</span>
                <span>${num(item?.finalTotalPrice).toFixed(2)}</span>
              </div>
            </div>
          ))}

          {/* Packaged (BOGO) line items — compact summary */}
          {(order?.packagedLineItems || []).map((pkg, pi) => {
            const dealName =
              pkg?.bogoDealPackageConstructorSnapShotData?.name ||
              "Package Deal";
            const lineTotal = (arr) =>
              (arr || []).reduce((acc, it) => {
                const li = it.createdLineItem || it;
                return acc + num(li.finalTotalPrice);
              }, 0);
            const total =
              lineTotal(pkg.parentLineItems) + lineTotal(pkg.childLineItems);
            return (
              <div key={`pkg-${pi}`} className="p-3">
                <div className="mb-2 rounded bg-blue-50 p-2 text-blue-800">
                  🎁 BOGO Deal: {dealName}
                </div>
                {[
                  ...(pkg.parentLineItems || []),
                  ...(pkg.childLineItems || []),
                ].map((it, ii) => {
                  const li = it.createdLineItem || it;
                  return (
                    <div key={ii} className="flex justify-between py-0.5">
                      <span className="truncate">
                        {li?.snapShotData?.productName} × {li?.purchaseQuantity}
                      </span>
                      <span className="font-medium">
                        ${num(li?.finalTotalPrice).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>BOGO Deal Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall tax breakdown — same-named taxes summed across every item */}
        {taxRows.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 font-semibold">Total Tax Breakdown</div>
            <div className="space-y-1">
              {taxRows.map((t) => (
                <div
                  key={t.name}
                  className="flex justify-between text-[#9CA3AF]">
                  <span>
                    {t.name}
                    {t.rate != null && <span>({t.rate}%)</span>}
                  </span>
                  <span className="font-medium text-[#76CA99]">
                    ${t.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
                <span>Tax Total</span>
                <span>${taxTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Totals + transactions */}
        <div className="space-y-0.5 border-t border-border px-4 py-3">
          <Row
            label="Total"
            value={`$${num(order?.finalSubTotal).toFixed(2)}`}
          />
          {transactions.map((txn, idx) => (
            <Row
              key={idx}
              label={getTransactionLabel(txn)}
              value={`${txn.type === "DEBIT" ? "-" : ""}$${num(txn.amount).toFixed(2)}`}
            />
          ))}
          <Row
            label="Tips Collected"
            value={`$${num(order?.tipGiven).toFixed(2)}`}
          />
          <Row
            label="Total Amount Received"
            value={`$${received.toFixed(2)}`}
          />
          <Row label="Change Due" value={`$${changeDue.toFixed(2)}`} />
        </div>
      </div>

      {/* MJ items */}
      <div className="rounded-lg border border-border p-3">
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
