"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LayoutGrid, List, ArrowUpDown, FilterX, ChevronLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SkeletonLoader from "@/components/pos/SkeletonLoader";
import ProductGridView from "@/components/pos/ProductGridView";
import ProductDetailPanel from "@/components/pos/ProductDetailPanel";
import ScanInput from "@/components/pos/ScanInput";

import { listInventories } from "@/services/inventories/listInventories";
import { listBrands } from "@/services/classifications/listBrands";
import { listCategories } from "@/services/classifications/listCategories";
import { getInventorySellable } from "@/services/sales/inventorySellable";
import { getQuoteForSales } from "@/services/sales/getQuoteforSales";
import { quoteApiManager } from "@/utils/quoteApiManager";

import { addToCart } from "@/store/slices/cartSlice";
import { addLineItemsAction } from "@/store/slices/lineItemsSlice";
import { updateSalesDetail } from "@/store/slices/salesDetailSlice";
import { getQuoteForSale } from "@/store/slices/quoteForSaleSlice";

// Ported from productList.js — product listing with search, category/brand
// filtering, pagination, and the sellable-packages -> add-to-cart flow.
//
// Preserved exactly: the activeFiltersRef single-source-of-truth filter model
// (so no stale-closure filter bugs), buildBaseParams param assembly, the
// customerGroupId-driven refetch, sellable-package mapping/display, the decimal
// (0.25) vs integer quantity math, dedup vs cart, and the quote refresh through
// the shared quoteApiManager.
//
// Simplified from the old file (out of the product/cart scope, and depended on
// unported antd widgets): matrix product resolution (variant picker) and the
// duplicate-in-cart Alert banner. Category/brand pickers are single-select
// here (old APIDataSelect was multi-select); the filter handlers still
// normalise to id arrays so the backend contract is unchanged. The full-screen
// package detail panel (ProductDetailsPage, incl. per-location columns) and
// the "search and select products" typeahead (ProductDropdown) are ported —
// see ProductDetailPanel.jsx / ProductSearchDropdown.jsx.
export default function ProductList({
  setAddSelected,
  setMiscallenousType,
  discountTypes = [],
  setNotes,
  notes,
  scrollToTop = () => {},
  initialView = "list",
  autoOpenProduct,
  showFooterActions = true,
  onClose,
  refreshSignal,
}) {
  const dispatch = useDispatch();
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const lineItems = useSelector((state: any) => state?.lineItems?.lineItems) || [];
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};

  const [loading, setLoading] = useState(false);
  const [productsData, setProductsData] = useState([]);
  const [paginationData, setPaginationData] = useState({
    limit: 30,
    page: 1,
    totalEntries: 0,
    totalPages: 0,
  });
  const [view, setView] = useState(initialView);
  const [searchTerm, setSearchTerm] = useState("product");

  const [allBrands, setAllBrands] = useState([]);
  const [allCategory, setAllCategory] = useState([]);

  // Packages drawer state
  const [showDetail, setShowDetail] = useState(false);
  const [fetchModalProductDetails, setFetchModalProductDetails] = useState(null);
  const [packagesData, setPackagesData] = useState([]);
  const [locationColumns, setLocationColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [quantities, setQuantities] = useState({});

  const activeFiltersRef = useRef({ categoryIds: [], brandIds: [], sortParam: null });
  // Guards setState-after-unmount: this whole tree unmounts when the user
  // switches off the "Process Order" tab while a fetch is still in flight.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isLocked = Object.keys(saleDetail).length > 0;

  const fetchProductsData = useCallback(
    (filters = [
      { name: "limit", value: 30 },
      { name: "page", value: 1 },
    ]) => {
      setLoading(true);
      return listInventories(filters)
        .then((res) => {
          if (!mountedRef.current) return res.data;
          const { inventories } = res.data.data;
          setProductsData(inventories);
          const { limit, totalPages, totalEntries, currentPage } =
            res.data.data.paginationData || {};
          setPaginationData({ limit, page: currentPage, totalEntries, totalPages });
          setLoading(false);
          return res.data;
        })
        .catch((error) => {
          if (!mountedRef.current) return;
          setLoading(false);
          toast.error(error?.message || "Failed to load products");
        });
    },
    []
  );

  useEffect(() => {
    fetchProductsData();
    listBrands([{ name: "limit", value: 30 }, { name: "page", value: 1 }]).then((res) =>
      setAllBrands(res?.data?.brands || [])
    );
    listCategories([{ name: "limit", value: 30 }, { name: "page", value: 1 }]).then((res) =>
      setAllCategory(res?.data?.categories || [])
    );
  }, [fetchProductsData]);

  // Refetch scoped to the customer group whenever it changes (pricing tiers).
  useEffect(() => {
    if (quoteBody?.customerGroupId) {
      fetchProductsData([
        { name: "limit", value: 30 },
        { name: "page", value: 1 },
        { name: "customerGroupId", value: quoteBody.customerGroupId },
      ]);
    }
  }, [quoteBody?.customerGroupId, fetchProductsData]);

  // Re-fetch current stock in place (no unmount/remount) each time the
  // "Manage Cart Items" drawer is reopened — skips the initial mount, which
  // already fetches via the effect above.
  const isFirstRefreshRef = useRef(true);
  useEffect(() => {
    if (isFirstRefreshRef.current) {
      isFirstRefreshRef.current = false;
      return;
    }
    fetchProductsData(buildBaseParams(activeFiltersRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // Build params from an explicit filters snapshot — no stale-closure risk.
  const buildBaseParams = (filters, searchValue = "") => {
    const f = filters ?? activeFiltersRef.current;
    const params: { name: string; value: any }[] = [
      { name: "limit", value: 30 },
      { name: "page", value: 1 },
    ];
    if (f.categoryIds?.length > 0) params.push({ name: "categoryIds", value: f.categoryIds });
    if (f.brandIds?.length > 0) params.push({ name: "brandIds", value: f.brandIds });
    if (f.sortParam) params.push(f.sortParam);
    if (searchValue) params.push({ name: "search", value: searchValue });
    return params;
  };

  const handleSearch = (value) => fetchProductsData(buildBaseParams(activeFiltersRef.current, value));

  const handleCategoryFilter = (value) => {
    const categoryIds = value && value !== "all" ? [value] : [];
    const updated = { ...activeFiltersRef.current, categoryIds };
    activeFiltersRef.current = updated;
    fetchProductsData(buildBaseParams(updated));
  };

  const handleBrandFilter = (value) => {
    const brandIds = value && value !== "all" ? [value] : [];
    const updated = { ...activeFiltersRef.current, brandIds };
    activeFiltersRef.current = updated;
    fetchProductsData(buildBaseParams(updated));
  };

  const fetchProductsDataForPagination = (page) =>
    fetchProductsData([
      { name: "limit", value: String(paginationData.limit) },
      { name: "page", value: page },
    ]);

  // Opened via the "Search and select products..." dropdown — jump straight
  // to that product's package panel, same as clicking its grid card.
  useEffect(() => {
    if (!autoOpenProduct) {
      setShowDetail(false);
      setFetchModalProductDetails(null);
      return;
    }
    setFetchModalProductDetails(autoOpenProduct);
    setSelectedRowKeys([]);
    setShowDetail(true);
    fetchSellablePackages(autoOpenProduct.productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenProduct]);

  // --- Sellable packages + add-to-cart ---
  const fetchSellablePackages = (productId) => {
    setIsLoading(true);
    getInventorySellable(productId)
      .then((res) => {
        if (!mountedRef.current) return;
        const { inventory } = res.data.data;
        if (!inventory) {
          setPackagesData([]);
          setIsLoading(false);
          return;
        }
        const updatedPackagesInfo = (inventory.packagesInfo || []).map((item) => ({
          ...item,
          id: item?.id,
          key: item?.id,
          productId: inventory?.inventoryInfo?.productId,
          productName: inventory?.inventoryInfo?.productNameSnapShot,
          inventoryId: inventory?.inventoryInfo?.id,
          price: inventory?.inventoryInfo?.unitPrice,
          sellableUomShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
          shouldAllowDecimalValue:
            (
              inventory?.inventoryInfo?.projectQtyMeasurementPolicy ??
              inventory?.inventoryInfo?.measurementPolicy
            )?.shouldAllowDecimalValue === true,
          projectQtyConversionRate: inventory?.inventoryInfo?.projectQtyConversionRate,
          sellableUoMShortForm: inventory?.inventoryInfo?.sellableUomShortForm,
          // item.storageLocationBreakdown (from the spread above) is this
          // package's own per-location quantities; keep it as-is rather than
          // overwriting with the inventory-level list.
        }));
        setPackagesData(updatedPackagesInfo);
        setLocationColumns(inventory?.inventoryInfo?.storageLocationBreakdown || []);
        setIsLoading(false);
        if (updatedPackagesInfo.length === 0) toast.error("Package not found");
      })
      .catch((error) => {
        if (!mountedRef.current) return;
        setPackagesData([]);
        setIsLoading(false);
        toast.error(error?.message || "Failed to load packages");
      });
  };

  const handleQuantityChange = (id, delta) => {
    const pkg = packagesData.find((item) => item.id === id);
    const isDecimalAllowed = pkg?.shouldAllowDecimalValue || false;
    setQuantities((prev) => {
      const current = prev[id] || 1;
      const next = isDecimalAllowed
        ? Math.max(0.25, parseFloat((current + delta).toFixed(2)))
        : Math.max(1, Math.round(current + delta));
      if (delta > 0 && pkg?.quantityLeft != null && next > pkg.quantityLeft) {
        toast.error("Entered quantity exceeds available quantity.");
      }
      return { ...prev, [id]: next };
    });
  };

  const handleInputQuantity = (id, value) => {
    const pkg = packagesData.find((item) => item.id === id);
    const isDecimalAllowed = pkg?.shouldAllowDecimalValue || false;
    const parsed = isDecimalAllowed ? parseFloat(value) : parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= (isDecimalAllowed ? 0.25 : 1)) {
      if (pkg?.quantityLeft != null && parsed > pkg.quantityLeft) {
        toast.error("Entered quantity exceeds available quantity.");
      }
      setQuantities((prev) => ({ ...prev, [id]: parsed }));
    }
  };

  const handleAddToState = () => {
    const selectedPackagesData = packagesData.filter((p) => selectedRowKeys.includes(p.key));
    const uniqueSelectedPackagesData = selectedPackagesData.filter(
      (p) => !cart.some((item) => item.id === p.id)
    );

    if (uniqueSelectedPackagesData.length === 0) {
      toast.error("The Selected Item Already Exists in Cart.");
      return;
    }

    const packagesWithExtraFields = uniqueSelectedPackagesData.map((item) => {
      const conversionRate = item?.projectQtyConversionRate || 1;
      const base = quantities[item.id] || 1;
      return {
        ...item,
        inventoryId: item.inventoryId,
        packageId: item.id,
        purchaseQuantity: conversionRate * base,
        disabledDiscountSources: [],
      };
    });

    const updatedLineItems = [...cart, ...packagesWithExtraFields];
    dispatch(addToCart(updatedLineItems));
    dispatch(addLineItemsAction(updatedLineItems));
    dispatch(updateSalesDetail({ lineItems: updatedLineItems }));

    quoteApiManager
      .call(getQuoteForSales, { ...quoteBody, lineItems: updatedLineItems }, "productList-add-to-cart")
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((err) => toast.error(err?.message || "Failed to refresh quote"));

    setShowDetail(false);
    setSelectedRowKeys([]);
    setQuantities({});
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search + filters + type toggle — all in one row, matching the old POS toolbar */}
      <div className="mb-3 flex flex-col gap-2 rounded-lg bg-[#00152A] p-3 text-white md:flex-row md:items-center md:flex-wrap">
        <Select defaultValue="product" onValueChange={setSearchTerm}>
          <SelectTrigger className="w-40 border-white/20 bg-[#00152B] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">Product ID</SelectItem>
            <SelectItem value="package">Package ID</SelectItem>
          </SelectContent>
        </Select>

        {searchTerm === "product" ? (
          <Input
            placeholder="Search product"
            className="border-white/20 bg-[#00152B] text-white placeholder:text-white/50 md:w-56"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(e.currentTarget.value);
            }}
            onChange={(e) => {
              if (e.target.value === "") handleSearch("");
            }}
          />
        ) : (
          <ScanInput setAddSelected={setAddSelected} />
        )}

        {searchTerm === "product" && (
          <>
            <Select onValueChange={handleCategoryFilter}>
              <SelectTrigger className="w-48 border-white/20 bg-[#00152B] text-white">
                <SelectValue placeholder="Select Category">
                  {(value) => {
                    if (value === "all") return "All Categories";
                    const c = allCategory.find((item) => item.id === value);
                    return c?.name || "Select Category";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategory.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleBrandFilter}>
              <SelectTrigger className="w-48 border-white/20 bg-[#00152B] text-white">
                <SelectValue placeholder="Select Brand">
                  {(value) => {
                    if (value === "all") return "All Brands";
                    const b = allBrands.find((item) => item.id === value);
                    return b?.name || "Select Brand";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {allBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {searchTerm === "product" && (
          <div className="ml-auto flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white"
                    aria-label="Sort"
                  >
                    <ArrowUpDown />
                  </Button>
                }
              />
              <DropdownMenuContent>
                {[
                  { label: "Price: Low to High", name: "unitPrice", value: "asc" },
                  { label: "Price: High to Low", name: "unitPrice", value: "desc" },
                  { label: "Name: A-Z", name: "productName", value: "asc" },
                  { label: "Name: Z-A", name: "productName", value: "desc" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.label}
                    onClick={() => {
                      const updated = {
                        ...activeFiltersRef.current,
                        sortParam: { name: "sort", value: `${opt.name}:${opt.value}` },
                      };
                      activeFiltersRef.current = updated;
                      fetchProductsData(buildBaseParams(updated));
                    }}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="icon"
              className="border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white"
              aria-label="Remove filters"
              onClick={() => {
                activeFiltersRef.current = { categoryIds: [], brandIds: [], sortParam: null };
                fetchProductsData();
              }}
            >
              <FilterX />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white"
              onClick={() => setView(view === "list" ? "grid" : "list")}
              aria-label="Toggle view"
            >
              {view === "list" ? <LayoutGrid /> : <List />}
            </Button>
            {onClose && (
              <Button
                variant="outline"
                size="icon"
                className="border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white"
                aria-label="Close"
                onClick={onClose}
              >
                <ChevronLeft />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Listing */}
      <div className="min-h-0 flex-1 overflow-auto">
      {searchTerm === "product" &&
        (showDetail ? (
          <ProductDetailPanel
            product={fetchModalProductDetails}
            packagesData={packagesData}
            locationColumns={locationColumns}
            isLoading={isLoading}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
            quantities={quantities}
            setQuantities={setQuantities}
            onQuantityDelta={handleQuantityChange}
            onQuantityInput={handleInputQuantity}
            onBack={() => setShowDetail(false)}
            onAddToCart={handleAddToState}
          />
        ) : loading ? (
          <SkeletonLoader rows={6} />
        ) : view === "list" ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Total QTY</th>
                  <th className="px-2 py-2">Sellable QTY</th>
                  <th className="px-2 py-2">Price</th>
                  <th className="px-2 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {productsData.map((record) => (
                  <tr key={record.id} className="border-b">
                    <td className="px-2 py-2">{record?.productName}</td>
                    <td className="px-2 py-2">
                      {record?.totalQuantity} {record.sellableUoMShortForm}
                    </td>
                    <td className="px-2 py-2">
                      {record?.totalActiveQuantity} {record.sellableUoMShortForm}
                    </td>
                    <td className="px-2 py-2">${record?.unitPrice}</td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          fetchSellablePackages(record?.productId);
                          setShowDetail(true);
                          setFetchModalProductDetails(record);
                          setSelectedRowKeys([]);
                        }}
                      >
                        Packages
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ProductGridView
            data={productsData}
            paginationData={paginationData}
            onPageChange={fetchProductsDataForPagination}
            setShowDetail={setShowDetail}
            fetchSellablePackages={fetchSellablePackages}
            setSelectedRowKeys={setSelectedRowKeys}
            setFetchModalProductDetails={setFetchModalProductDetails}
          />
        ))}
      </div>

      {/* Misc charge / notes actions (gated exactly as old) */}
      {showFooterActions && (
        <div className="mt-3 flex justify-end gap-2">
          {discountTypes.includes("MISCELLANEOUS") && (
            <>
              <Button
                disabled={isLocked}
                onClick={() => {
                  setMiscallenousType?.("charge");
                  scrollToTop?.();
                }}
              >
                Add Miscellaneous Charge
              </Button>
              <Button
                disabled={isLocked || quoteBody?.miscDiscount !== null}
                onClick={() => {
                  setMiscallenousType?.("discount");
                  scrollToTop?.();
                }}
              >
                Add Miscellaneous Discount
              </Button>
            </>
          )}
          <Button disabled={isLocked} onClick={() => setNotes?.(!notes)}>
            {!notes ? "Notes" : "Hide Notes"}
          </Button>
        </div>
      )}

    </div>
  );
}
