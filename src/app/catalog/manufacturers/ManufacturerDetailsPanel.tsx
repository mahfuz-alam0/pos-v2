"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { fetchSingleBrand } from "@/services/brands/getSingle";
import { fetchShopsData } from "@/services/shops/list";
import { updateEcommStatusBrand } from "@/services/brands/updateEcommStatus";
import { getCurrentUser } from "@/util/use-current-user";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActivityLogDrawer from "@/components/admin/ActivityLogDrawer";

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

interface SupplierRow {
  id: string | number;
  name: string;
  phoneNumber?: string;
}

interface BrandDetail {
  id: string | number;
  name: string;
  highlights?: string | null;
  details?: string | null;
  image?: string | null;
  suppliers?: SupplierRow[];
  ecommStatuses?: EcommStatus[];
}

function readOrgFeatureScopes(): string[] {
  return getCurrentUser()?.orgFeatureScopes || [];
}

interface ManufacturerDetailsPanelProps {
  brandId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

export default function ManufacturerDetailsPanel({ brandId, onClose, onEdit }: ManufacturerDetailsPanelProps) {
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [hasEcomPermission, setHasEcomPermission] = useState(false);
  const [tab, setTab] = useState("details");

  const [shops, setShops] = useState<ShopRow[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [ecommStatuses, setEcommStatuses] = useState<EcommStatus[]>([]);
  const [localEcommStatuses, setLocalEcommStatuses] = useState<EcommStatus[]>([]);
  const [savingShopId, setSavingShopId] = useState<string | number | null>(null);

  useEffect(() => {
    setHasEcomPermission(readOrgFeatureScopes().includes("E-COMMERCE"));
  }, []);

  useEffect(() => {
    if (!brandId) return;
    setLoading(true);
    fetchSingleBrand(brandId)
      .then((res) => {
        const b = res?.data;
        setBrand(b ?? null);
        const statuses = b?.ecommStatuses ?? [];
        setEcommStatuses(statuses);
        setLocalEcommStatuses(JSON.parse(JSON.stringify(statuses)));
      })
      .catch(() => toast.error("Failed to load brand details"))
      .finally(() => setLoading(false));
  }, [brandId]);

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
      await updateEcommStatusBrand({
        id: brandId,
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

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Brand Details</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActivityOpen(true)}>
              Activity
            </Button>
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !brand ? (
            <p className="py-4 text-sm text-muted-foreground">Manufacturer not found.</p>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                {hasEcomPermission && <TabsTrigger value="ecomm">Ecomm Configuration</TabsTrigger>}
              </TabsList>

              <TabsContent value="details" className="mt-3">
                <div className="flex flex-col gap-2">
                  {brand.image && (
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="size-16 rounded-lg object-cover ring-1 ring-foreground/10"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="w-32 shrink-0 text-sm text-muted-foreground">Manufacturer Name:</span>
                    <span className="flex-1 text-sm font-medium">{brand.name ?? "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-32 shrink-0 text-sm text-muted-foreground">Highlight:</span>
                    <span className="flex-1 text-sm">{brand.highlights ?? "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-32 shrink-0 text-sm text-muted-foreground">Manufacturer Detail:</span>
                    <span className="flex-1 text-sm">{brand.details ?? "-"}</span>
                  </div>
                </div>
              </TabsContent>

              {hasEcomPermission && (
                <TabsContent value="ecomm" className="mt-3">
                  {shopLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        Enable or disable this brand on different platforms for each shop.
                      </p>

                      {shops.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">No shops available</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader className="[&_tr]:border-b-0">
                              <TableRow className="bg-muted/60">
                                <TableHead>Shop Name</TableHead>
                                <TableHead className="text-center">Web</TableHead>
                                <TableHead className="text-center">iOS</TableHead>
                                <TableHead className="text-center">Android</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shops.map((shop, i) => (
                                <TableRow
                                  key={shop.id}
                                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
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
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Suppliers Details</h2>
        </div>
        <div className="h-px bg-border" />

        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(brand?.suppliers ?? []).length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  No suppliers available.
                </TableCell>
              </TableRow>
            )}
            {(brand?.suppliers ?? []).map((supplier, i) => (
              <TableRow
                key={supplier.id}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{supplier.phoneNumber ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ActivityLogDrawer open={activityOpen} onClose={() => setActivityOpen(false)} domain="BRAND" targetId={brandId} />
    </div>
  );
}
