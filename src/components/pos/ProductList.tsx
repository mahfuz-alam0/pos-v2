"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutGrid,
  List,
  ArrowUpDown,
  FilterX,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Camera,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Drawer from "@/components/ui/Drawer";
import SkeletonLoader from "@/components/pos/SkeletonLoader";
import ProductGridView from "@/components/pos/ProductGridView";
import ProductDetailPanel from "@/components/pos/ProductDetailPanel";
import ScanInput from "@/components/pos/ScanInput";
import BarcodeScanDialog from "@/components/pos/BarcodeScanDialog";

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
  refreshSignal = 0,
  cartPanel = null,
  cartPanelOpen = false,
  onToggleCartPanel = undefined,
}) {
  const dispatch = useDispatch();
  const cart = useSelector((state: any) => state?.cart?.cart) || [];
  const lineItems =
    useSelector((state: any) => state?.lineItems?.lineItems) || [];
  const quoteBody = useSelector((state: any) => state?.salesDetail);
  const saleDetail = useSelector((state: any) => state?.saleData) || {};

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsData, setProductsData] = useState([]);
  const [paginationData, setPaginationData] = useState({
    limit: 30,
    page: 1,
    totalEntries: 0,
    totalPages: 0,
  });
  const [view, setView] = useState(initialView);
  const [searchTerm, setSearchTerm] = useState("product");
  const [searchQuery, setSearchQuery] = useState("");

  const [allBrands, setAllBrands] = useState([]);
  const [allCategory, setAllCategory] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [barcodeScanOpen, setBarcodeScanOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<{
    value: string;
    nonce: number;
  } | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [brandSearchQuery, setBrandSearchQuery] = useState("");

  // Packages drawer state
  const [showDetail, setShowDetail] = useState(false);
  const [fetchModalProductDetails, setFetchModalProductDetails] =
    useState(null);
  const [packagesData, setPackagesData] = useState([]);
  const [locationColumns, setLocationColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [quantities, setQuantities] = useState({});

  const activeFiltersRef = useRef({
    categoryIds: [],
    brandIds: [],
    sortParam: null,
  });
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
    (
      filters = [
        { name: "limit", value: 30 },
        { name: "page", value: 1 },
      ],
      append = false,
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      return listInventories(filters)
        .then((res) => {
          if (!mountedRef.current) return res.data;
          const { inventories } = res.data.data;
          setProductsData((prev) => {
            if (!append) return inventories;
            // Defensive dedupe — a page fetched twice (e.g. a fast
            // re-intersection of the infinite-scroll sentinel) or backend
            // pagination overlap would otherwise append the same product id
            // twice, which React then reports as a duplicate key.
            const seen = new Set(prev.map((p) => p.id));
            const deduped = inventories.filter((p) => !seen.has(p.id));
            return [...prev, ...deduped];
          });
          const { limit, totalPages, totalEntries, currentPage } =
            res.data.data.paginationData || {};
          setPaginationData({
            limit,
            page: currentPage,
            totalEntries,
            totalPages,
          });
          setLoading(false);
          setLoadingMore(false);
          return res.data;
        })
        .catch((error) => {
          if (!mountedRef.current) return;
          setLoading(false);
          setLoadingMore(false);
          toast.error(error?.message || "Failed to load products");
        });
    },
    [],
  );

  useEffect(() => {
    fetchProductsData();
    listBrands([
      { name: "limit", value: 30 },
      { name: "page", value: 1 },
    ]).then((res) => setAllBrands(res?.data?.brands || []));
    listCategories([
      { name: "limit", value: 30 },
      { name: "page", value: 1 },
    ]).then((res) => setAllCategory(res?.data?.categories || []));
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
  const buildBaseParams = (filters, searchValue = "", page = 1) => {
    const f = filters ?? activeFiltersRef.current;
    const params: { name: string; value: any }[] = [
      { name: "limit", value: 30 },
      { name: "page", value: page },
    ];
    if (f.categoryIds?.length > 0)
      params.push({ name: "categoryIds", value: f.categoryIds });
    if (f.brandIds?.length > 0)
      params.push({ name: "brandIds", value: f.brandIds });
    if (f.sortParam) params.push(f.sortParam);
    if (searchValue) params.push({ name: "search", value: searchValue });
    return params;
  };

  const handleSearch = (value) =>
    fetchProductsData(buildBaseParams(activeFiltersRef.current, value));

  // Auto-search as the user types — debounced 0.5s, and only once there are
  // at least 2 characters (avoids firing a search on every single keystroke
  // for a 1-character query, which is rarely useful and just churns the API).
  useEffect(() => {
    if (searchTerm !== "product" || searchQuery.length < 2) return;
    const timer = setTimeout(() => handleSearch(searchQuery), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchTerm]);

  // Toggle behaviour: clicking an already-selected chip removes just that
  // filter; clicking "all" clears the whole group; clicking any other chip
  // adds it alongside whatever's already selected (multi-select).
  const handleCategoryFilter = (value) => {
    const categoryIds =
      value === "all"
        ? []
        : selectedCategoryIds.includes(value)
          ? selectedCategoryIds.filter((id) => id !== value)
          : [...selectedCategoryIds, value];
    const updated = { ...activeFiltersRef.current, categoryIds };
    activeFiltersRef.current = updated;
    setSelectedCategoryIds(categoryIds);
    fetchProductsData(buildBaseParams(updated));
  };

  const handleBrandFilter = (value) => {
    const brandIds =
      value === "all"
        ? []
        : selectedBrandIds.includes(value)
          ? selectedBrandIds.filter((id) => id !== value)
          : [...selectedBrandIds, value];
    const updated = { ...activeFiltersRef.current, brandIds };
    activeFiltersRef.current = updated;
    setSelectedBrandIds(brandIds);
    fetchProductsData(buildBaseParams(updated));
  };

  const hasMoreProducts =
    (paginationData.page || 1) < (paginationData.totalPages || 1);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMoreProducts) return;
    fetchProductsData(
      buildBaseParams(
        activeFiltersRef.current,
        searchTerm === "product" ? searchQuery : "",
        (paginationData.page || 1) + 1,
      ),
      true,
    );
  };

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
        const updatedPackagesInfo = (inventory.packagesInfo || []).map(
          (item) => ({
            ...item,
            id: item?.id,
            key: item?.id,
            productId: inventory?.inventoryInfo?.productId,
            productName: inventory?.inventoryInfo?.productNameSnapShot,
            inventoryId: inventory?.inventoryInfo?.id,
            price: inventory?.inventoryInfo?.unitPrice,
            sellableUomShortForm:
              inventory?.inventoryInfo?.sellableUomShortForm,
            shouldAllowDecimalValue:
              (
                inventory?.inventoryInfo?.projectQtyMeasurementPolicy ??
                inventory?.inventoryInfo?.measurementPolicy
              )?.shouldAllowDecimalValue === true,
            projectQtyConversionRate:
              inventory?.inventoryInfo?.projectQtyConversionRate,
            sellableUoMShortForm:
              inventory?.inventoryInfo?.sellableUomShortForm,
            // item.storageLocationBreakdown (from the spread above) is this
            // package's own per-location quantities; keep it as-is rather than
            // overwriting with the inventory-level list.
          }),
        );
        setPackagesData(updatedPackagesInfo);
        setLocationColumns(
          inventory?.inventoryInfo?.storageLocationBreakdown || [],
        );
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
    const selectedPackagesData = packagesData.filter((p) =>
      selectedRowKeys.includes(p.key),
    );

    // Adding the same package again always creates a new, independent cart
    // line (e.g. Product A x2, then Product A x5 as a separate row) rather
    // than being merged or blocked — each line's own quote data is kept
    // distinct via a fresh appMaintainedId (see lineItemMatching.ts).
    const packagesWithExtraFields = selectedPackagesData.map((item) => {
      const conversionRate = item?.projectQtyConversionRate || 1;
      const base = quantities[item.id] || 1;
      const lineId = crypto.randomUUID();
      return {
        ...item,
        key: lineId,
        appMaintainedId: lineId,
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
      .call(
        getQuoteForSales,
        { ...quoteBody, lineItems: updatedLineItems },
        "productList-add-to-cart",
      )
      .then((res) => dispatch(getQuoteForSale(res.data)))
      .catch((err) => toast.error(err?.message || "Failed to refresh quote"));

    setShowDetail(false);
    setSelectedRowKeys([]);
    setQuantities({});
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search + filters + type toggle — all in one row, matching the old POS toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-lg bg-[#00152A] p-3.5 text-white">
        <label className="flex shrink-0 items-center gap-2.5 rounded-lg border border-white/20 bg-[#00152B] px-3 h-12">
          <Switch
            checked={searchTerm === "product"}
            onCheckedChange={(checked) =>
              setSearchTerm(checked ? "product" : "package")
            }
          />
          <span className="whitespace-nowrap text-sm font-medium text-white/80">
            {searchTerm === "product" ? "Product" : "Package"}
          </span>
        </label>

        {searchTerm === "product" ? (
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-white/50" />
            <Input
              value={searchQuery}
              placeholder="Scan product id"
              className="h-12 w-full border-white/20 bg-[#00152B] pl-11 text-base text-white placeholder:text-white/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(e.currentTarget.value);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value === "") handleSearch("");
              }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  handleSearch("");
                }}
                className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="min-w-40 flex-1">
            <ScanInput
              setAddSelected={setAddSelected}
              placeholder="Scan package id"
              className="h-12 border-white/20 bg-[#00152B] text-base text-white placeholder:text-white/50"
              scannedCode={scannedCode}
            />
          </div>
        )}

        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white [&_svg]:size-5"
            aria-label="Scan Barcode / QR Code"
            title="Scan Barcode / QR Code"
            onClick={() => {
              setSearchTerm("package");
              setBarcodeScanOpen(true);
            }}>
            <Camera />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white [&_svg]:size-5 ${
              selectedCategoryIds.length > 0 || selectedBrandIds.length > 0
                ? "border-primary text-primary"
                : ""
            }`}
            aria-label="Filter by category or brand"
            onClick={() => setFilterDrawerOpen(true)}>
            <Filter />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white [&_svg]:size-5"
            aria-label="Remove filters"
            onClick={() => {
              activeFiltersRef.current = {
                categoryIds: [],
                brandIds: [],
                sortParam: null,
              };
              setSelectedCategoryIds([]);
              setSelectedBrandIds([]);
              fetchProductsData();
            }}>
            <FilterX />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white [&_svg]:size-5"
                  aria-label="Sort">
                  <ArrowUpDown />
                </Button>
              }
            />
            <DropdownMenuContent>
              {[
                {
                  label: "Price: Low to High",
                  name: "unitPrice",
                  value: "asc",
                },
                {
                  label: "Price: High to Low",
                  name: "unitPrice",
                  value: "desc",
                },
                { label: "Name: A-Z", name: "productName", value: "asc" },
                { label: "Name: Z-A", name: "productName", value: "desc" },
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.label}
                  className="py-2.5 text-base"
                  onClick={() => {
                    const updated = {
                      ...activeFiltersRef.current,
                      sortParam: {
                        name: "sort",
                        value: `${opt.name}:${opt.value}`,
                      },
                    };
                    activeFiltersRef.current = updated;
                    fetchProductsData(buildBaseParams(updated));
                  }}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white [&_svg]:size-5"
            onClick={() => setView(view === "list" ? "grid" : "list")}
            aria-label="Toggle view">
            {view === "list" ? <LayoutGrid /> : <List />}
          </Button>
          {onClose && (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 border-white/20 bg-[#00152B] text-white hover:bg-[#038FDE] hover:text-white [&_svg]:size-5"
              aria-label="Close"
              onClick={onClose}>
              <ChevronLeft />
            </Button>
          )}
        </div>
      </div>

      <BarcodeScanDialog
        open={barcodeScanOpen}
        onClose={() => setBarcodeScanOpen(false)}
        onScan={(text) => {
          setBarcodeScanOpen(false);
          setScannedCode({ value: text, nonce: Date.now() });
        }}
      />

      {/* Filter by category / brand */}
      <Drawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        side="right"
        size="60vw">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4 text-base font-semibold">
            Filter Products
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col border-b border-border p-4">
              <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categories
              </div>
              <div className="relative mb-3 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search categories"
                  className="h-11 pl-9"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => handleCategoryFilter("all")}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      selectedCategoryIds.length === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}>
                    All Categories
                  </button>
                  {allCategory
                    .filter((c) =>
                      c.name
                        ?.toLowerCase()
                        .includes(categorySearchQuery.toLowerCase()),
                    )
                    .map((c) => {
                      const active = selectedCategoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCategoryFilter(c.id)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}>
                          {c.name}
                          {active && <X className="size-3.5" />}
                        </button>
                      );
                    })}
                  {categorySearchQuery &&
                    allCategory.filter((c) =>
                      c.name
                        ?.toLowerCase()
                        .includes(categorySearchQuery.toLowerCase()),
                    ).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No categories match.
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Brands
              </div>
              <div className="relative mb-3 shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={brandSearchQuery}
                  onChange={(e) => setBrandSearchQuery(e.target.value)}
                  placeholder="Search brands"
                  className="h-11 pl-9"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => handleBrandFilter("all")}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      selectedBrandIds.length === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}>
                    All Brands
                  </button>
                  {allBrands
                    .filter((b) =>
                      b.name
                        ?.toLowerCase()
                        .includes(brandSearchQuery.toLowerCase()),
                    )
                    .map((b) => {
                      const active = selectedBrandIds.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleBrandFilter(b.id)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}>
                          {b.name}
                          {active && <X className="size-3.5" />}
                        </button>
                      );
                    })}
                  {brandSearchQuery &&
                    allBrands.filter((b) =>
                      b.name
                        ?.toLowerCase()
                        .includes(brandSearchQuery.toLowerCase()),
                    ).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No brands match.
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border p-4">
            <Button
              className="h-12 w-full text-base"
              onClick={() => setFilterDrawerOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Listing */}
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
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
                        {record?.totalActiveQuantity}{" "}
                        {record.sellableUoMShortForm}
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
                          }}>
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
              hasMore={hasMoreProducts}
              loadingMore={loadingMore}
              onLoadMore={handleLoadMore}
              setShowDetail={setShowDetail}
              fetchSellablePackages={fetchSellablePackages}
              setSelectedRowKeys={setSelectedRowKeys}
              setFetchModalProductDetails={setFetchModalProductDetails}
            />
          )}
        </div>

        {onToggleCartPanel && (
          <button
            type="button"
            onClick={onToggleCartPanel}
            title={cartPanelOpen ? "Hide cart" : "Show cart"}
            className="z-10 mx-1.5 flex h-16 w-5 shrink-0 self-center items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-[#038FDE] hover:text-white">
            {cartPanelOpen ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        )}

        {cartPanel && (
          <div
            className={`h-full shrink-0 overflow-hidden transition-[max-width] duration-300 ease-in-out ${
              cartPanelOpen ? "max-w-105" : "max-w-0"
            }`}>
            {cartPanel}
          </div>
        )}
      </div>

      {/* Product details — full-screen instead of replacing the grid in place */}
      <Drawer
        open={showDetail}
        onClose={() => setShowDetail(false)}
        side="right"
        size="100vw">
        <div className="h-full overflow-y-auto p-4">
          {showDetail && (
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
          )}
        </div>
      </Drawer>

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
                }}>
                Add Miscellaneous Charge
              </Button>
              <Button
                disabled={isLocked || quoteBody?.miscDiscount !== null}
                onClick={() => {
                  setMiscallenousType?.("discount");
                  scrollToTop?.();
                }}>
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
