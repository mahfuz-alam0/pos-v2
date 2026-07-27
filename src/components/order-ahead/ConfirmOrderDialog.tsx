"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listInventories } from "@/services/inventories/listInventories";
import { confirmPreSale } from "@/services/orderAhead/confirmPreSale";
import { useShop } from "@/context/shop-context";
import ProxyPinDialog from "./ProxyPinDialog";
import { usePinGatedAction } from "./usePinGatedAction";

function collectLineItems(preSale) {
  const saleData = preSale?.info?.saleData;
  const nonPackaged = saleData?.nonPackagedLineItems || [];
  const bundles = saleData?.packagedLineItems || [];
  return { nonPackaged, bundles };
}

export default function ConfirmOrderDialog({ open, onClose, preSale, onConfirmed }) {
  const { shopId } = useShop();
  const [inventoryByProductId, setInventoryByProductId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [acceptedBundles, setAcceptedBundles] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { nonPackaged, bundles } = useMemo(() => collectLineItems(preSale), [preSale]);

  useEffect(() => {
    if (!open || !preSale) return;

    const productIds = new Set();
    nonPackaged.forEach((item) => item?.snapShotData?.productId && productIds.add(item.snapShotData.productId));
    bundles.forEach((bundle) => {
      [bundle.parentLineItem, ...(bundle.childLineItems || [])].forEach(
        (item) => item?.snapShotData?.productId && productIds.add(item.snapShotData.productId)
      );
    });
    if (productIds.size === 0) return;

    setLoading(true);
    listInventories([
      { name: "limit", value: 30 },
      { name: "page", value: 1 },
      { name: "includeProductIds", value: [...productIds] },
    ])
      .then((res) => {
        const inventories = res?.data?.data?.inventories || [];
        const map: Record<string, number> = {};
        inventories.forEach((inv) => {
          map[inv.productId] = inv.totalSellableQuantityOnline || 0;
        });
        setInventoryByProductId(map);

        const initialAccepted = new Set<string>();
        nonPackaged.forEach((item) => {
          const pid = item?.snapShotData?.productId;
          if (pid && (map[pid] || 0) >= (item.purchaseQuantity || 0)) initialAccepted.add(pid);
        });
        const initialBundles = new Set<number>();
        bundles.forEach((bundle, index) => {
          const items = [bundle.parentLineItem, ...(bundle.childLineItems || [])];
          const allInStock = items.every((item) => {
            const pid = item?.snapShotData?.productId;
            return pid && (map[pid] || 0) >= (item.purchaseQuantity || 0);
          });
          if (allInStock) initialBundles.add(index);
        });
        setAccepted(initialAccepted);
        setAcceptedBundles(initialBundles);
      })
      .catch(() => toast.error("Failed to load inventory availability"))
      .finally(() => setLoading(false));
  }, [open, preSale, shopId, nonPackaged, bundles]);

  const toggleProduct = (productId) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const toggleBundle = (index) => {
    setAcceptedBundles((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const acceptedProductIds = useMemo(() => {
    const ids = new Set(accepted);
    acceptedBundles.forEach((index) => {
      const pid = bundles[index]?.parentLineItem?.snapShotData?.productId;
      if (pid) ids.add(pid);
    });
    return [...ids];
  }, [accepted, acceptedBundles, bundles]);

  const submit = async (proxyPin) => {
    setSubmitting(true);
    try {
      await confirmPreSale({
        shopId,
        preSaleId: preSale.id,
        proxyPin,
        acceptedProductIds,
      });
      toast.success("Order confirmed successfully");
      onConfirmed?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to confirm order");
    } finally {
      setSubmitting(false);
    }
  };

  const { run, pinDialogOpen, closePinDialog, submitPin } = usePinGatedAction(submit);

  if (!preSale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Order #{preSale.advertisedId}</DialogTitle>
            <DialogDescription>
              Accept the items you can fulfill. Out-of-stock items are unchecked by default.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto">
            {nonPackaged.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Needed</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead className="text-center">Accept</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonPackaged.map((item, i) => {
                    const pid = item?.snapShotData?.productId;
                    const available = inventoryByProductId[pid] || 0;
                    const needed = item.purchaseQuantity || 0;
                    const outOfStock = available < needed;
                    return (
                      <TableRow key={pid || i}>
                        <TableCell>
                          <div className="font-medium">{item?.snapShotData?.productName}</div>
                          {outOfStock && <div className="text-xs text-destructive">Out of stock</div>}
                        </TableCell>
                        <TableCell className="text-center">{needed}</TableCell>
                        <TableCell className={`text-center ${outOfStock ? "text-destructive" : "text-emerald-600"}`}>
                          {available}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={accepted.has(pid)} onCheckedChange={() => toggleProduct(pid)} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {bundles.length > 0 && (
              <div className="mt-4 space-y-3">
                {bundles.map((bundle, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">
                        {bundle?.bogoDealPackageConstructorSnapShotData?.name || `Bundle ${index + 1}`}
                      </span>
                      <Switch checked={acceptedBundles.has(index)} onCheckedChange={() => toggleBundle(index)} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[bundle.parentLineItem, ...(bundle.childLineItems || [])]
                        .map((item) => item?.snapShotData?.productName)
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && nonPackaged.length === 0 && bundles.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">No products to fulfill</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => run()} disabled={acceptedProductIds.length === 0 || submitting}>
              {submitting ? "Confirming..." : "Confirm Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProxyPinDialog
        open={pinDialogOpen}
        onClose={closePinDialog}
        onSubmit={submitPin}
        title="Enter PIN to confirm order"
      />
    </>
  );
}
