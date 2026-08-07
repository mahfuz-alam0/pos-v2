"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Image as ImageIcon,
  ShoppingBag,
  Star,
  Rocket,
  Tag as TagIcon,
  RefreshCw,
  X,
} from "lucide-react";

import { getMenuItemDetails } from "@/services/weedmaps/getMenuItemDetails";
import { getWMBrands } from "@/services/weedmaps/getWMBrands";
import { getWMBrandProducts } from "@/services/weedmaps/getWMBrandProducts";
import { getWMCategories } from "@/services/weedmaps/getWMCategories";
import { createBrandedProductMenuItem } from "@/services/weedmaps/createBrandedProductMenuItem";
import { createCustomProductMenuItem } from "@/services/weedmaps/createCustomProductMenuItem";
import { refreshWeedmapsMenuItemData } from "@/services/weedmaps/refreshMenuItem";
import { removeWeedmapsMenuItem } from "@/services/weedmaps/removeWeedmapsMenuItem";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ONBOARD_TYPE = { BRANDED: "branded", CUSTOM: "custom" } as const;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2 text-sm last:border-0">
      <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value ?? <span className="italic text-muted-foreground">—</span>}</span>
    </div>
  );
}

function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex size-5.5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {done ? "✓" : num}
      </div>
      <span
        className={cn(
          "text-[11px] font-semibold tracking-wide uppercase",
          done ? "text-green-600" : active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

/** Generic search-as-you-type popover picker with infinite scroll, used for WM brand/product/category selection. */
function SearchPicker({
  placeholder,
  value,
  onSearch,
  onOpen,
  onScrollEnd,
  loading,
  items,
  renderItem,
  itemKey,
  onSelect,
  selectedLabel,
}: {
  placeholder: string;
  value: string;
  onSearch: (v: string) => void;
  onOpen: () => void;
  onScrollEnd: () => void;
  loading: boolean;
  items: any[];
  renderItem: (item: any) => React.ReactNode;
  itemKey: (item: any) => string | number;
  onSelect: (item: any) => void;
  selectedLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) onOpen();
      }}
    >
      <PopoverTrigger className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 text-sm">
        {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-2" align="start">
        <Input
          autoFocus
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onSearch(e.target.value);
          }}
          className="mb-2"
        />
        <div
          className="max-h-64 overflow-y-auto"
          onScroll={(e) => {
            const t = e.currentTarget;
            if (t.scrollTop + t.offsetHeight >= t.scrollHeight - 20) onScrollEnd();
          }}
        >
          {items.map((item) => (
            <button
              key={itemKey(item)}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
              onClick={() => {
                onSelect(item);
                setOpen(false);
              }}
            >
              {renderItem(item)}
            </button>
          ))}
          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">No results found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ManageWeedmapsDrawer({
  open,
  onClose,
  inventory,
  vmIntegrated,
  onSyncSuccess,
}: {
  open: boolean;
  onClose: () => void;
  inventory: any;
  vmIntegrated: boolean;
  onSyncSuccess?: () => void;
}) {
  const shopId = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("shopId") || "null") : null;
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [onboardType, setOnboardType] = useState<string>(ONBOARD_TYPE.BRANDED);

  const [brands, setBrands] = useState<any[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandPage, setBrandPage] = useState(1);
  const [brandHasMore, setBrandHasMore] = useState(true);
  const [brandLoading, setBrandLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const brandSearchTimer = useRef<any>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productHasMore, setProductHasMore] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const productSearchTimer = useRef<any>(null);

  const [onboardLoading, setOnboardLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<any>(null);
  const [customSelectedBrand, setCustomSelectedBrand] = useState<any>(null);
  const [customBrands, setCustomBrands] = useState<any[]>([]);
  const [customBrandSearch, setCustomBrandSearch] = useState("");
  const [customBrandPage, setCustomBrandPage] = useState(1);
  const [customBrandHasMore, setCustomBrandHasMore] = useState(true);
  const [customBrandLoading, setCustomBrandLoading] = useState(false);
  const customBrandTimer = useRef<any>(null);

  const hasWeedmapId = !!inventory?.weedmapProductId;

  const resetOnboardState = () => {
    setOnboardType(ONBOARD_TYPE.BRANDED);
    setBrands([]);
    setBrandSearch("");
    setBrandPage(1);
    setBrandHasMore(true);
    setSelectedBrand(null);
    setProducts([]);
    setProductSearch("");
    setProductPage(1);
    setProductHasMore(true);
    setSelectedProduct(null);
    setCategories([]);
    setSelectedCategory(null);
    setSelectedSubCategoryIds(null);
    setCustomSelectedBrand(null);
    setCustomBrands([]);
    setCustomBrandSearch("");
    setCustomBrandPage(1);
    setCustomBrandHasMore(true);
  };

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res: any = await getMenuItemDetails({ shopId, inventoryId: inventory?.inventoryId || inventory?.id });
      setDetails(res?.data || null);
    } catch {
      toast.error("Failed to fetch Weedmaps details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && hasWeedmapId) fetchDetails();
    else setDetails(null);
    if (!open) resetOnboardState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inventory?.weedmapProductId]);

  const fetchBrands = async ({ search = "", page = 1, append = false }: { search?: string; page?: number; append?: boolean }) => {
    setBrandLoading(true);
    try {
      const res: any = await getWMBrands({ shopId, search, page, page_size: 20 });
      const raw = res?.data?.brands ?? res?.data?.data ?? res?.data ?? [];
      const items = Array.isArray(raw) ? raw : [];
      if (append) setBrands((prev) => [...prev, ...items]);
      else setBrands(items);
      setBrandHasMore(items.length === 20);
      setBrandPage(page);
    } catch {
      toast.error("Failed to load brands.");
    } finally {
      setBrandLoading(false);
    }
  };

  const handleBrandSearch = (value: string) => {
    setBrandSearch(value);
    if (brandSearchTimer.current) clearTimeout(brandSearchTimer.current);
    brandSearchTimer.current = setTimeout(() => fetchBrands({ search: value, page: 1, append: false }), 400);
  };

  const fetchProducts = async ({
    brandId,
    search = "",
    page = 1,
    append = false,
  }: {
    brandId: string | number;
    search?: string;
    page?: number;
    append?: boolean;
  }) => {
    setProductLoading(true);
    try {
      const res: any = await getWMBrandProducts({ shopId, brand_id: brandId, search, page, page_size: 20 });
      const raw = res?.data?.products ?? res?.data?.data ?? res?.data ?? [];
      const items = Array.isArray(raw) ? raw : [];
      if (append) setProducts((prev) => [...prev, ...items]);
      else setProducts(items);
      setProductHasMore(items.length === 20);
      setProductPage(page);
    } catch {
      toast.error("Failed to load products.");
    } finally {
      setProductLoading(false);
    }
  };

  const handleProductSearch = (value: string) => {
    setProductSearch(value);
    if (!selectedBrand) return;
    if (productSearchTimer.current) clearTimeout(productSearchTimer.current);
    productSearchTimer.current = setTimeout(
      () => fetchProducts({ brandId: selectedBrand.id, search: value, page: 1, append: false }),
      400
    );
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res: any = await getWMCategories({ shopId, search: "" });
      setCategories(Array.isArray(res?.data?.categories) ? res.data.categories : []);
    } catch {
      toast.error("Failed to load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchCustomBrands = async ({ search = "", page = 1, append = false }: { search?: string; page?: number; append?: boolean }) => {
    setCustomBrandLoading(true);
    try {
      const res: any = await getWMBrands({ shopId, search, page, page_size: 20 });
      const raw = res?.data?.brands ?? res?.data?.data ?? res?.data ?? [];
      const items = Array.isArray(raw) ? raw : [];
      if (append) setCustomBrands((prev) => [...prev, ...items]);
      else setCustomBrands(items);
      setCustomBrandHasMore(items.length === 20);
      setCustomBrandPage(page);
    } catch {
      toast.error("Failed to load brands.");
    } finally {
      setCustomBrandLoading(false);
    }
  };

  const handleCustomBrandSearch = (value: string) => {
    setCustomBrandSearch(value);
    if (customBrandTimer.current) clearTimeout(customBrandTimer.current);
    customBrandTimer.current = setTimeout(() => fetchCustomBrands({ search: value, page: 1, append: false }), 400);
  };

  const handleOnboard = async () => {
    setConfirmOpen(false);
    setOnboardLoading(true);
    try {
      await createBrandedProductMenuItem({
        shopId,
        inventoryId: inventory?.inventoryId || inventory?.id,
        wmProductId: selectedProduct?.id,
        brandId: selectedBrand?.id,
      });
      toast.success("Product onboarded to Weedmaps.");
      onSyncSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to onboard product.");
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleCustomOnboard = async () => {
    setConfirmOpen(false);
    setOnboardLoading(true);
    try {
      const inventoryId = inventory?.inventoryId || inventory?.id;
      await createCustomProductMenuItem({
        shopId,
        inventoryId,
        preferredWmBrandId: customSelectedBrand?.id ?? 0,
        preferredWmCategoryId: selectedCategory?.id ?? 0,
        preferredWmSubCategoryId: selectedSubCategoryIds ?? 0,
      });
      try {
        await refreshWeedmapsMenuItemData(shopId, inventoryId);
      } catch {
        // non-blocking
      }
      toast.success("Product onboarded to Weedmaps.");
      onSyncSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to onboard product.");
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirmOpen(false);
    setDeleteLoading(true);
    try {
      await removeWeedmapsMenuItem({ shopId, inventoryId: inventory?.inventoryId || inventory?.id });
      toast.success("Removed from Weedmaps.");
      onSyncSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove from Weedmaps.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshLoading(true);
    try {
      await refreshWeedmapsMenuItemData(shopId, inventory?.inventoryId || inventory?.id);
      toast.success("Weedmaps listing refreshed.");
      fetchDetails();
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh Weedmaps listing.");
    } finally {
      setRefreshLoading(false);
    }
  };

  const subCategories = selectedCategory?.children || [];

  return (
    <Drawer open={open} onClose={onClose} side="right" size="min(1000px, 92vw)">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <img src="/images/vm.png" alt="Weedmaps" className="size-6 rounded-full border object-contain" />
            <h3 className="text-base font-semibold">Manage Weedmaps</h3>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Inventory info banner */}
          <div
            className={cn(
              "mb-4 rounded-xl border p-3",
              hasWeedmapId
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                : "border-border bg-muted/40"
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar size="lg" className="rounded-lg">
                <AvatarImage src={inventory?.thumbnail} alt={inventory?.name} />
                <AvatarFallback className="rounded-lg">
                  <ImageIcon className="size-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{inventory?.name || inventory?.productName || "—"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {hasWeedmapId ? (
                    <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle2 className="size-3" /> Synced to Weedmaps
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="size-3" /> Not Synced
                    </Badge>
                  )}
                  {inventory?.weedmapProductId && (
                    <span className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                      #{inventory.weedmapProductId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!hasWeedmapId && vmIntegrated && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Choose Onboarding Type</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOnboardType(ONBOARD_TYPE.BRANDED)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-colors",
                      onboardType === ONBOARD_TYPE.BRANDED ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          onboardType === ONBOARD_TYPE.BRANDED ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Star className="size-4" />
                      </div>
                      <span className="text-sm font-bold">Branded Product</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Link to an existing Weedmaps brand &amp; product catalog item.</p>
                  </button>

                  <button
                    onClick={() => setOnboardType(ONBOARD_TYPE.CUSTOM)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-colors",
                      onboardType === ONBOARD_TYPE.CUSTOM ? "border-green-500 bg-green-500/5" : "border-border"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          onboardType === ONBOARD_TYPE.CUSTOM ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <ShoppingBag className="size-4" />
                      </div>
                      <span className="text-sm font-bold">Custom Product</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Create a new custom product listing on Weedmaps.</p>
                  </button>
                </div>
              </div>

              {onboardType === ONBOARD_TYPE.BRANDED && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2.5">
                    <StepBadge num={1} label="Select Brand" active={!selectedBrand} done={!!selectedBrand} />
                    <div className={cn("h-0.5 flex-1 rounded", selectedBrand ? "bg-green-500" : "bg-border")} />
                    <StepBadge num={2} label="Select Product" active={!!selectedBrand && !selectedProduct} done={!!selectedProduct} />
                    <div className={cn("h-0.5 flex-1 rounded", selectedProduct ? "bg-green-500" : "bg-border")} />
                    <StepBadge num={3} label="Onboard" active={!!selectedProduct} done={false} />
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Step 1 — Select Brand</p>
                    <SearchPicker
                      placeholder="Search Weedmaps brands…"
                      value={brandSearch}
                      loading={brandLoading}
                      items={brands}
                      itemKey={(b) => b.id}
                      selectedLabel={selectedBrand?.name}
                      onOpen={() => brands.length === 0 && fetchBrands({ search: brandSearch, page: 1, append: false })}
                      onSearch={handleBrandSearch}
                      onScrollEnd={() => brandHasMore && !brandLoading && fetchBrands({ search: brandSearch, page: brandPage + 1, append: true })}
                      onSelect={(brand) => {
                        setSelectedBrand(brand);
                        setSelectedProduct(null);
                        setProducts([]);
                        setProductSearch("");
                      }}
                      renderItem={(brand) => (
                        <>
                          <Avatar size="sm">
                            <AvatarImage src={brand.avatar_image_url || brand.image_url} alt={brand.name} />
                            <AvatarFallback>{brand.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{brand.name}</span>
                        </>
                      )}
                    />
                  </div>

                  {selectedBrand && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Step 2 — Select Product</p>
                      <SearchPicker
                        placeholder="Search products…"
                        value={productSearch}
                        loading={productLoading}
                        items={products}
                        itemKey={(p) => p.id}
                        selectedLabel={selectedProduct?.name}
                        onOpen={() =>
                          products.length === 0 &&
                          fetchProducts({ brandId: selectedBrand.id, search: productSearch, page: 1, append: false })
                        }
                        onSearch={handleProductSearch}
                        onScrollEnd={() =>
                          productHasMore &&
                          !productLoading &&
                          fetchProducts({ brandId: selectedBrand.id, search: productSearch, page: productPage + 1, append: true })
                        }
                        onSelect={(product) => setSelectedProduct(product)}
                        renderItem={(product) => (
                          <>
                            <Avatar size="sm" className="rounded">
                              <AvatarImage src={product.image_url} alt={product.name} />
                              <AvatarFallback className="rounded">{product.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{product.name}</span>
                          </>
                        )}
                      />
                    </div>
                  )}

                  {selectedProduct && (
                    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20">
                      <div className="flex items-center gap-1.5 border-b bg-amber-100 px-3 py-1.5 dark:bg-amber-900/30">
                        <TagIcon className="size-3.5" />
                        <span className="text-[11px] font-bold tracking-wide uppercase">Selected Product Details</span>
                      </div>
                      <div className="p-3">
                        <div className="flex gap-3">
                          <Avatar size="lg" className="rounded-lg">
                            <AvatarImage src={selectedProduct.image_url} alt={selectedProduct.name} />
                            <AvatarFallback className="rounded-lg">
                              <ShoppingBag className="size-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">{selectedProduct.name}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {selectedProduct.category && <Badge variant="outline">{selectedProduct.category}</Badge>}
                              {selectedProduct.genetics && <Badge variant="outline">{selectedProduct.genetics}</Badge>}
                              {selectedProduct.license_type && <Badge variant="outline">{selectedProduct.license_type}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2.5 rounded-lg bg-background/60 px-2.5">
                          {selectedProduct.id && <InfoRow label="WM Product ID" value={`#${selectedProduct.id}`} />}
                          {selectedBrand?.name && <InfoRow label="Brand" value={selectedBrand.name} />}
                          {selectedProduct.slug && <InfoRow label="Slug" value={selectedProduct.slug} />}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedProduct && (
                    <Button onClick={() => setConfirmOpen(true)} disabled={onboardLoading} className="gap-2">
                      {onboardLoading ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                      {onboardLoading ? "Onboarding…" : "Onboard Menu Item"}
                    </Button>
                  )}
                </div>
              )}

              {onboardType === ONBOARD_TYPE.CUSTOM && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="mb-2 text-[11px] font-bold tracking-wide text-orange-600 uppercase">Step 1 — Select WM Category (Optional)</p>
                    <Select
                      value={selectedCategory?.id ? String(selectedCategory.id) : undefined}
                      onValueChange={(v) => {
                        const cat = categories.find((c) => String(c.id) === v);
                        setSelectedCategory(cat || null);
                        setSelectedSubCategoryIds(null);
                      }}
                      onOpenChange={(open) => open && categories.length === 0 && fetchCategories()}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={categoriesLoading ? "Loading..." : "Select a Weedmaps category…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory && (
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <p className="mb-2 text-[11px] font-bold tracking-wide text-purple-600 uppercase">Step 2 — Select Sub-category (Optional)</p>
                      {subCategories.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No sub-categories available for this category.</p>
                      ) : (
                        <Select
                          value={selectedSubCategoryIds ? String(selectedSubCategoryIds) : undefined}
                          onValueChange={(v) => setSelectedSubCategoryIds(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select sub-category…" />
                          </SelectTrigger>
                          <SelectContent>
                            {subCategories.map((sub: any) => (
                              <SelectItem key={sub.id} value={String(sub.id)}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="mb-2 text-[11px] font-bold tracking-wide text-sky-600 uppercase">Step 3 — Select Brand (Optional)</p>
                    <SearchPicker
                      placeholder="Search Weedmaps brands…"
                      value={customBrandSearch}
                      loading={customBrandLoading}
                      items={customBrands}
                      itemKey={(b) => b.id}
                      selectedLabel={customSelectedBrand?.name}
                      onOpen={() => customBrands.length === 0 && fetchCustomBrands({ search: customBrandSearch, page: 1, append: false })}
                      onSearch={handleCustomBrandSearch}
                      onScrollEnd={() =>
                        customBrandHasMore &&
                        !customBrandLoading &&
                        fetchCustomBrands({ search: customBrandSearch, page: customBrandPage + 1, append: true })
                      }
                      onSelect={(brand) => setCustomSelectedBrand(brand)}
                      renderItem={(brand) => (
                        <>
                          <Avatar size="sm">
                            <AvatarImage src={brand.avatar_image_url || brand.image_url} alt={brand.name} />
                            <AvatarFallback>{brand.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{brand.name}</span>
                        </>
                      )}
                    />
                  </div>

                  <Button onClick={() => setConfirmOpen(true)} disabled={onboardLoading} className="gap-2 bg-green-600 hover:bg-green-700">
                    {onboardLoading ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                    {onboardLoading ? "Onboarding…" : "Onboard as Custom Product"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {hasWeedmapId && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-end gap-2">
                {vmIntegrated && (
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshLoading} className="gap-1.5">
                    <RefreshCw className={cn("size-3.5", refreshLoading && "animate-spin")} />
                    {refreshLoading ? "Refreshing…" : "Refresh WM"}
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)} disabled={deleteLoading} className="gap-1.5">
                  <XCircle className="size-3.5" />
                  {deleteLoading ? "Removing…" : "Remove from Weedmaps"}
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : details ? (
                <>
                  <div className="flex gap-3 rounded-xl border bg-green-50/50 p-3 dark:bg-green-950/10">
                    <Avatar size="lg" className="rounded-lg">
                      <AvatarImage src={details.image_url} alt={details.name} />
                      <AvatarFallback className="rounded-lg">
                        <ShoppingBag className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 text-sm font-bold">{details.name}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={details.published ? "default" : "secondary"}>
                          {details.published ? "Published" : "Unpublished"}
                        </Badge>
                        <Badge variant="outline">{details.online_orderable ? "Online Orderable" : "Not Orderable"}</Badge>
                        {details.license_type && <Badge variant="outline">{details.license_type}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border px-3">
                    <InfoRow label="WM ID" value={details.id} />
                    <InfoRow label="Inventory Qty" value={details.inventory_quantity} />
                    <InfoRow
                      label="Price"
                      value={details.price?.amount ? `$${parseFloat(details.price.amount).toFixed(2)} ${details.price.currency}` : null}
                    />
                    <InfoRow label="Items per Pack" value={details.items_per_pack} />
                    <InfoRow label="Brand" value={details.brand?.name} />
                    <InfoRow label="Product" value={details.product?.name} />
                    {details.genetics && <InfoRow label="Genetics" value={details.genetics} />}
                    {details.compliance?.weight?.value && (
                      <InfoRow label="Weight" value={`${details.compliance.weight.value} ${details.compliance.weight.unit}`} />
                    )}
                  </div>

                  {details.variants?.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-bold tracking-wide text-primary uppercase">Variants ({details.variants.length})</p>
                      <div className="flex flex-col gap-2">
                        {details.variants.map((v: any) => (
                          <div
                            key={v.id}
                            className={cn(
                              "flex items-center justify-between rounded-lg border px-3 py-2",
                              v.online_orderable ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("size-2 rounded-full", v.online_orderable ? "bg-green-500" : "bg-muted-foreground")} />
                              <span className="font-mono text-xs text-muted-foreground">#{v.id}</span>
                              <Badge variant="outline">{v.license_type}</Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">Qty: {v.inventory_quantity}</span>
                              <span className="text-sm font-bold">${parseFloat(v.price?.amount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">No Weedmaps data found</p>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Onboarding</AlertDialogTitle>
            <AlertDialogDescription>
              {onboardType === ONBOARD_TYPE.BRANDED ? (
                <>
                  Are you sure you want to onboard <strong>{inventory?.name}</strong> as a branded product on Weedmaps using{" "}
                  <strong>{selectedProduct?.name}</strong>?
                </>
              ) : (
                <>
                  Onboard <strong>{inventory?.name}</strong> as a custom product on Weedmaps
                  {selectedCategory && (
                    <>
                      {" "}
                      in <strong>{selectedCategory.name}</strong>
                    </>
                  )}
                  {customSelectedBrand && (
                    <>
                      {" "}
                      under brand <strong>{customSelectedBrand.name}</strong>
                    </>
                  )}
                  ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onboardType === ONBOARD_TYPE.BRANDED ? handleOnboard : handleCustomOnboard} disabled={onboardLoading}>
              {onboardLoading ? "Onboarding..." : "Yes, Onboard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={(o) => !o && !deleteLoading && setDeleteConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Weedmaps</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{inventory?.name}</strong> from Weedmaps? This will unlink the menu item listing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Removing..." : "Yes, Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
}
