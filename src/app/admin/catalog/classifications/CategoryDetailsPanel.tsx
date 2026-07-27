"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { fetchSingleCategory } from "@/services/categories/getSingle";
import { fetchMetrcCategories, fetchMetrcPurchaseCategoryTypes } from "@/services/categories/metrcDatasets";
import { fetchShopsData } from "@/services/shops/list";
import { updateEcommStatusCategory } from "@/services/categories/updateEcommStatus";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ActivityLogDrawer from "./ActivityLogDrawer";

interface CategoryDetail {
  id: string | number;
  name: string;
  details?: string | null;
  image?: string | null;
  colorCode?: string | null;
  classification?: { id: string | number; name: string; isMJ?: boolean };
  metrcCategoryStringId?: string | null;
  metrcPurchaseCategoryStringId?: string | null;
  ecommStatuses?: EcommStatus[];
}

interface EcommStatus {
  shopId: string | number;
  isDisabledFromIOSEcomm: boolean;
  isDisabledFromAndroidEcomm: boolean;
  isDisabledFromWEBEcomm: boolean;
}

interface ShopRow {
  id: string | number;
  name: string;
}

function readOrgFeatureScopes(): string[] {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "null")?.orgFeatureScopes || [];
  } catch {
    return [];
  }
}

interface CategoryDetailsPanelProps {
  categoryId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

export default function CategoryDetailsPanel({ categoryId, onClose, onEdit }: CategoryDetailsPanelProps) {
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [hasEcomPermission, setHasEcomPermission] = useState(false);
  const [tab, setTab] = useState("details");

  const [metrcCategories, setMetrcCategories] = useState<{ stringId: string; displayName: string }[]>([]);
  const [metrcPurchaseCategories, setMetrcPurchaseCategories] = useState<
    { productCategoryTypeStringId: string; productCategoryType: string }[]
  >([]);

  const [shops, setShops] = useState<ShopRow[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [ecommStatuses, setEcommStatuses] = useState<EcommStatus[]>([]);
  const [localEcommStatuses, setLocalEcommStatuses] = useState<EcommStatus[]>([]);
  const [savingShopId, setSavingShopId] = useState<string | number | null>(null);

  useEffect(() => {
    setHasEcomPermission(readOrgFeatureScopes().includes("E-COMMERCE"));
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    fetchSingleCategory(categoryId)
      .then((res) => {
        const c = res?.data;
        setCategory(c ?? null);
        const statuses = c?.ecommStatuses ?? [];
        setEcommStatuses(statuses);
        setLocalEcommStatuses(JSON.parse(JSON.stringify(statuses)));
      })
      .catch(() => toast.error("Failed to load category details"))
      .finally(() => setLoading(false));
  }, [categoryId]);

  useEffect(() => {
    fetchMetrcCategories().then((res) => setMetrcCategories(res?.data ?? []));
    fetchMetrcPurchaseCategoryTypes().then((res) => setMetrcPurchaseCategories(res?.data ?? []));
  }, []);

  useEffect(() => {
    if (tab !== "ecomm" || !hasEcomPermission) return;
    setShopLoading(true);
    fetchShopsData()
      .then((res) => setShops(res?.data ?? []))
      .catch(() => toast.error("Failed to load shops"))
      .finally(() => setShopLoading(false));
  }, [tab, hasEcomPermission]);

  const isPlatformDisabled = (shopId: string | number, platform: "web" | "ios" | "android") => {
    const status = localEcommStatuses.find((s) => String(s.shopId) === String(shopId));
    if (!status) return false;
    if (platform === "web") return status.isDisabledFromWEBEcomm;
    if (platform === "ios") return status.isDisabledFromIOSEcomm;
    return status.isDisabledFromAndroidEcomm;
  };

  const handleToggle = (shopId: string | number, platform: "web" | "ios" | "android", checked: boolean) => {
    setLocalEcommStatuses((prev) => {
      const idx = prev.findIndex((s) => String(s.shopId) === String(shopId));
      const key =
        platform === "web" ? "isDisabledFromWEBEcomm" : platform === "ios" ? "isDisabledFromIOSEcomm" : "isDisabledFromAndroidEcomm";
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], [key]: checked };
        return next;
      }
      return [
        ...prev,
        {
          shopId,
          isDisabledFromIOSEcomm: platform === "ios" ? checked : false,
          isDisabledFromAndroidEcomm: platform === "android" ? checked : false,
          isDisabledFromWEBEcomm: platform === "web" ? checked : false,
        },
      ];
    });
  };

  const hasShopChanges = (shopId: string | number) => {
    const local = localEcommStatuses.find((s) => String(s.shopId) === String(shopId));
    const original = ecommStatuses.find((s) => String(s.shopId) === String(shopId));
    if (!local && !original) return false;
    if (!local || !original) return true;
    return JSON.stringify(local) !== JSON.stringify(original);
  };

  const saveShopConfiguration = async (shopId: string | number) => {
    const status = localEcommStatuses.find((s) => String(s.shopId) === String(shopId));
    if (!status) return;
    setSavingShopId(shopId);
    try {
      await updateEcommStatusCategory({
        id: categoryId,
        shopId: status.shopId,
        isDisabledFromIOSEcomm: status.isDisabledFromIOSEcomm,
        isDisabledFromAndroidEcomm: status.isDisabledFromAndroidEcomm,
        isDisabledFromWEBEcomm: status.isDisabledFromWEBEcomm,
      });
      toast.success("Shop configuration saved successfully");
      setEcommStatuses((prev) => {
        const idx = prev.findIndex((s) => String(s.shopId) === String(shopId));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...status };
          return next;
        }
        return [...prev, { ...status }];
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save shop configuration");
    } finally {
      setSavingShopId(null);
    }
  };

  const metrcCategoryLabel = metrcCategories.find((c) => c.stringId === category?.metrcCategoryStringId)?.displayName;
  const metrcPurchaseLabel = metrcPurchaseCategories.find(
    (c) => c.productCategoryTypeStringId === category?.metrcPurchaseCategoryStringId
  )?.productCategoryType;

  return (
    <Drawer open onClose={onClose} side="right" size={600}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <h3 className="m-0 text-lg font-semibold">Category Details</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)}>
              Activity
            </Button>
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !category ? (
            <p className="text-sm text-muted-foreground">Category not found.</p>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                {hasEcomPermission && <TabsTrigger value="ecomm">Ecomm Configuration</TabsTrigger>}
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-[150px_1fr] gap-y-3 gap-x-2 text-sm">
                  <div className="col-span-2">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="size-24 rounded-lg object-cover ring-1 ring-foreground/10"
                      />
                    ) : (
                      <div className="flex size-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="text-muted-foreground">Name:</div>
                  <div>{category.name ?? "-"}</div>

                  <div className="text-muted-foreground">Details:</div>
                  <div>{category.details ?? "-"}</div>

                  <div className="text-muted-foreground">Color Code:</div>
                  <div className="flex items-center gap-2">
                    {category.colorCode ?? "-"}
                    {category.colorCode && (
                      <div
                        className="size-3 rounded-full ring-1 ring-foreground/10"
                        style={{ backgroundColor: category.colorCode }}
                      />
                    )}
                  </div>

                  <div className="text-muted-foreground">Classification:</div>
                  <div>{category.classification?.name ?? "-"}</div>

                  {category.classification?.isMJ && (
                    <>
                      <div className="text-muted-foreground">Metrc Category Type:</div>
                      <div>{metrcCategoryLabel ?? "-"}</div>

                      <div className="text-muted-foreground">Metrc Purchase Type:</div>
                      <div>{metrcPurchaseLabel ?? "-"}</div>
                    </>
                  )}
                </div>
              </TabsContent>

              {hasEcomPermission && (
                <TabsContent value="ecomm" className="mt-4">
                  {shopLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        Enable or disable this category on different platforms for each shop.
                      </p>

                      {shops.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">No shops available</div>
                      ) : (
                        <Table>
                          <TableHeader className="[&_tr]:border-b-0">
                            <TableRow className="bg-muted/60">
                              <TableHead>Shop Name</TableHead>
                              <TableHead className="text-center">Hide Web</TableHead>
                              <TableHead className="text-center">Hide iOS</TableHead>
                              <TableHead className="text-center">Hide Android</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shops.map((shop, i) => (
                              <TableRow
                                key={shop.id}
                                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                              >
                                <TableCell className="font-medium">{shop.name}</TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={isPlatformDisabled(shop.id, "web")}
                                    onCheckedChange={(checked) => handleToggle(shop.id, "web", checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={isPlatformDisabled(shop.id, "ios")}
                                    onCheckedChange={(checked) => handleToggle(shop.id, "ios", checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={isPlatformDisabled(shop.id, "android")}
                                    onCheckedChange={(checked) => handleToggle(shop.id, "android", checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    disabled={!hasShopChanges(shop.id) || savingShopId === shop.id}
                                    onClick={() => saveShopConfiguration(shop.id)}
                                  >
                                    {savingShopId === shop.id ? <Loader2 className="size-4 animate-spin" /> : null}
                                    Save
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>

      <ActivityLogDrawer open={activityOpen} onClose={() => setActivityOpen(false)} domain="CATEGORY" targetId={categoryId} />
    </Drawer>
  );
}
