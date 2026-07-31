"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, Info, Loader2, AlertTriangle } from "lucide-react";

import { fetchSingleInventory } from "@/services/inventories/getSingle";
import { fetchSingleProduct } from "@/services/products/getSingle";
import { fetchPackagesList } from "@/services/packages/list";
import { deleteInventory } from "@/services/inventories/deleteInventory";
import { fetchWeedmapsConfig } from "@/services/weedmaps/getConfigs";
import { fetchLeaflyConfig } from "@/services/leafly/getConfig";
import { attachProductToWeedmap } from "@/services/weedmaps/attachToWeedmap";
import { refreshWeedmapsMenuItemData } from "@/services/weedmaps/refreshMenuItem";
import { getWeedmapsMenuItems } from "@/services/weedmaps/getMenuItems";
import { pushSelectedToLeafly } from "@/services/leafly/pushSelected";
import { removeSelectedFromLeafly } from "@/services/leafly/removeSelected";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Drawer from "@/components/ui/Drawer";
import PackageStorageLocations from "./PackageStorageLocations";
import ManageWeedmapsDrawer from "./ManageWeedmapsDrawer";
import ReconcilePackageDrawer from "../packages/ReconcilePackageDrawer";
import AddEditProductDrawer from "@/app/catalog/products/AddEditProductDrawer";

function detail(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function InventoryDetailsDrawer({
  inventoryId,
  onClose,
}: {
  inventoryId: number | string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [inventory, setInventory] = useState<any>(null);
  const [matrixInfo, setMatrixInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const shopId = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("shopId") || "null") : null;

  const [vmIntegrated, setVmIntegrated] = useState(false);
  const [leaflyIntegrated, setLeaflyIntegrated] = useState(false);

  const [inventoryHasPackages, setInventoryHasPackages] = useState(false);

  const [wmModalOpen, setWmModalOpen] = useState(false);
  const [wmMenuItems, setWmMenuItems] = useState<any[]>([]);
  const [wmMenuLoading, setWmMenuLoading] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);

  const [wmDrawerOpen, setWmDrawerOpen] = useState(false);
  const [refreshWmLoading, setRefreshWmLoading] = useState(false);

  const [pushLeaflyLoading, setPushLeaflyLoading] = useState(false);
  const [removeLeaflyLoading, setRemoveLeaflyLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [reconcilePackage, setReconcilePackage] = useState<any>(null);

  const [editProductOpen, setEditProductOpen] = useState(false);

  const loadInventory = () => {
    if (!inventoryId || !shopId) return;
    setLoading(true);
    setInventory(null);
    setMatrixInfo(null);
    fetchSingleInventory(inventoryId, shopId)
      .then((res: any) => {
        const inv = res?.data?.data?.inventory ?? null;
        setInventory(inv);
        if (inv?.productId) {
          fetchSingleProduct(inv.productId).then((pRes: any) => {
            setMatrixInfo(pRes?.data?.data?.product?.matrixInfo ?? null);
          });
        }
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load inventory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryId]);

  useEffect(() => {
    if (!inventoryId || !shopId) return;
    fetchWeedmapsConfig(shopId)
      .then((res: any) => {
        const cfg = res?.data?.data;
        setVmIntegrated(Boolean(cfg?.clientId || cfg?.merchantId || cfg?.menuId));
      })
      .catch(() => setVmIntegrated(false));
    fetchLeaflyConfig(shopId)
      .then((res: any) => setLeaflyIntegrated(Boolean(res?.data?.data?.menuIntegrationKey)))
      .catch(() => setLeaflyIntegrated(false));
  }, [inventoryId, shopId]);

  const checkInventoryPackages = () => {
    if (!inventory?.productId || !shopId) {
      setInventoryHasPackages(false);
      return;
    }
    fetchPackagesList(shopId, { limit: 1, page: 1, isFinished: false, productId: inventory.productId })
      .then((res: any) => setInventoryHasPackages((res?.data ?? []).length > 0))
      .catch(() => setInventoryHasPackages(false));
  };

  useEffect(() => {
    checkInventoryPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory?.productId]);

  const handleAttachToWeedmap = () => {
    setWmModalOpen(true);
    setWmMenuLoading(true);
    getWeedmapsMenuItems()
      .then((res: any) => setWmMenuItems(res?.data?.data ?? []))
      .catch(() => toast.error("Failed to load menu items"))
      .finally(() => setWmMenuLoading(false));
  };

  const handleAttachProduct = async () => {
    if (!selectedMenuId) return toast.error("Please select a menu item");
    setAttachLoading(true);
    try {
      await attachProductToWeedmap({
        shopId,
        menuId: Number(selectedMenuId),
        external_product_id: inventory.id,
      });
      toast.success("Product successfully attached to Weedmap!");
      setWmModalOpen(false);
      setSelectedMenuId(null);
      loadInventory();
    } catch (err: any) {
      toast.error(err?.message || "Failed to attach product to Weedmap");
    } finally {
      setAttachLoading(false);
    }
  };

  const handleRefreshWm = async () => {
    setRefreshWmLoading(true);
    try {
      await refreshWeedmapsMenuItemData(shopId, inventory.id);
      toast.success("Weedmaps listing refreshed.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to refresh Weedmaps listing.");
    } finally {
      setRefreshWmLoading(false);
    }
  };

  const handlePushToLeafly = async () => {
    if (!inventory?.id) return;
    setPushLeaflyLoading(true);
    try {
      const res: any = await pushSelectedToLeafly([inventory.id]);
      const { success, message } = res?.data?.data || {};
      if (success === false) {
        toast.error(message || "Failed to push to Leafly.");
      } else {
        toast.success(
          message || (inventory?.isPushedToLeafly ? "Leafly data refreshed successfully!" : "Inventory pushed to Leafly successfully!")
        );
        loadInventory();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to push to Leafly.");
    } finally {
      setPushLeaflyLoading(false);
    }
  };

  const handleRemoveFromLeafly = async () => {
    if (!inventory?.id) return;
    setRemoveLeaflyLoading(true);
    try {
      const res: any = await removeSelectedFromLeafly([inventory.id]);
      const { success, message } = res?.data?.data || {};
      if (success === false) {
        toast.error(message || "Failed to remove from Leafly.");
      } else {
        toast.success(message || "Inventory removed from Leafly successfully!");
        loadInventory();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove from Leafly.");
    } finally {
      setRemoveLeaflyLoading(false);
    }
  };

  const handleDeleteInventory = async () => {
    setDeleteLoading(true);
    try {
      await deleteInventory(inventory.id, shopId);
      toast.success("Inventory deleted successfully.");
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete inventory.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteDisabled = (vmIntegrated && !!inventory?.weedmapProductId) || inventoryHasPackages;

  return (
    <>
    <Drawer open={!!inventoryId} onClose={onClose} side="right" size="60%">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
          <div className="min-w-0 flex items-center gap-1.5">
            <div className="text-base font-semibold truncate">{inventory?.productName ?? "Product Details"}</div>
            {matrixInfo && (
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex shrink-0"
                  onClick={() => router.push(`/catalog/products/matrix?matrixId=${matrixInfo.id}`)}
                >
                  <Info className="size-3.5 animate-pulse text-blue-500" />
                </TooltipTrigger>
                <TooltipContent>Associated With Matrix</TooltipContent>
              </Tooltip>
            )}
          </div>
          {inventory && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditProductOpen(true)}>
                Edit Product
              </Button>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={`/admin/inventory/manage-inventories/edit/${inventory.id}`} />}
              >
                Edit Pricing
              </Button>

              {vmIntegrated && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="sm" className="inline-flex items-center gap-1">
                        <img src="/images/vm.png" alt="" className="size-4 rounded-full border border-white/35 object-contain" />
                        <ChevronDown className="size-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => (inventory?.weedmapProductId ? setWmDrawerOpen(true) : handleAttachToWeedmap())}
                    >
                      Manage WM
                    </DropdownMenuItem>
                    {inventory?.weedmapProductId && (
                      <DropdownMenuItem onClick={handleRefreshWm} disabled={refreshWmLoading}>
                        Refresh WM
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {leaflyIntegrated && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button size="sm" variant="outline" className="inline-flex items-center gap-1 border-green-500 text-green-600">
                        {(pushLeaflyLoading || removeLeaflyLoading) && <Loader2 className="size-3.5 animate-spin" />}
                        <img src="/images/leafly-logo.png" alt="" className="size-5 object-contain" />
                        <ChevronDown className="size-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handlePushToLeafly} disabled={pushLeaflyLoading}>
                      {inventory?.isPushedToLeafly ? "Refresh Leafly" : "Push to Leafly"}
                    </DropdownMenuItem>
                    {inventory?.isPushedToLeafly && (
                      <DropdownMenuItem onClick={handleRemoveFromLeafly} disabled={removeLeaflyLoading} variant="destructive">
                        Remove from Leafly
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!loading && inventory && (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {detail("Product Name:", inventory.productName)}
                  {detail("Unit of Measure:", inventory.sellableUoMShortForm ?? "-")}
                  {detail("Total Quantity:", inventory.totalQuantity ?? "0.00")}
                  {detail("Active Quantity:", inventory.totalActiveQuantity ?? "0.00")}
                  {inventory.projectQtyConversionRate &&
                    detail(
                      "Conversion Rate:",
                      `${inventory.projectQtyConversionRate} ${inventory.projectQtyUomShortForm ?? ""}`
                    )}
                  {inventory.projectQtyConversionRate &&
                    detail(
                      "Converted to:",
                      `${(+(inventory.totalQuantity / inventory.projectQtyConversionRate)).toFixed(2)} ${inventory.projectQtyUomShortForm ?? ""}`
                    )}
                  {inventory.weedmapProductId != null && detail("WM Product ID:", inventory.weedmapProductId)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Storage Locations</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackageStorageLocations
                    productId={inventory.productId}
                    shopId={shopId}
                    onReconcile={(pkg) => setReconcilePackage(pkg)}
                  />
                </CardContent>
              </Card>

              <Card className="ring-red-200 dark:ring-red-900">
                <CardHeader className="bg-red-50 dark:bg-red-950/30">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                    <AlertTriangle className="size-4" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="mb-1 text-sm font-medium">Delete this inventory</p>
                      <p className="text-xs text-muted-foreground">Once deleted, this inventory cannot be recovered.</p>

                      {vmIntegrated && !!inventory?.weedmapProductId && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          This inventory is synced with WM. Detach from WM before deleting.
                        </div>
                      )}
                      {leaflyIntegrated && !!inventory?.isPushedToLeafly && (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
                          <div className="flex items-center gap-1.5">
                            <img src="/images/leafly-logo.png" alt="" className="size-3.5 object-contain" />
                            This inventory is synced with Leafly.
                          </div>
                          <Button size="sm" variant="destructive" onClick={handleRemoveFromLeafly} disabled={removeLeaflyLoading}>
                            Remove from Leafly
                          </Button>
                        </div>
                      )}
                      {inventoryHasPackages && (
                        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          This inventory has packages attached. Detach all packages before deleting.
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="destructive" disabled={deleteDisabled} onClick={() => setDeleteConfirmOpen(true)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={wmModalOpen} onOpenChange={(v) => !v && setWmModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inventory?.productName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              <strong>Product:</strong> {inventory?.productName}
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Select Weedmaps Menu Item:</label>
              <Select value={selectedMenuId ?? undefined} onValueChange={setSelectedMenuId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={wmMenuLoading ? "Loading..." : "Search and select a menu item"} />
                </SelectTrigger>
                <SelectContent>
                  {wmMenuItems.map((item) => (
                    <SelectItem key={item.menuItemId} value={String(item.menuItemId)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWmModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAttachProduct} disabled={attachLoading}>
              {attachLoading ? "Attaching..." : "Attach Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => !open && !deleteLoading && setDeleteConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{inventory?.productName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteInventory} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>

    <ManageWeedmapsDrawer
      open={wmDrawerOpen}
      onClose={() => setWmDrawerOpen(false)}
      inventory={inventory}
      vmIntegrated={vmIntegrated}
      onSyncSuccess={loadInventory}
    />

    <ReconcilePackageDrawer
      open={!!reconcilePackage}
      packageDetail={reconcilePackage}
      onClose={() => setReconcilePackage(null)}
      onReconciled={() => {
        setReconcilePackage(null);
        checkInventoryPackages();
      }}
    />

    {inventory?.productId && (
      <AddEditProductDrawer
        open={editProductOpen}
        product={{ id: inventory.productId } as any}
        onClose={() => setEditProductOpen(false)}
        onDone={() => {
          setEditProductOpen(false);
          loadInventory();
        }}
      />
    )}
    </>
  );
}
