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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useShop } from "@/context/shop-context";
import { listStorageLocations } from "@/services/storageLocations/listStorageLocations";
import { listMinimalPackages } from "@/services/packages/listMinimal";
import { assignPackagesToPreSale } from "@/services/orderAhead/assignPackagesToPreSale";
import { getConfirmedLineItems, getPackagedLineItemsFlattened } from "./constants";
import ProxyPinDialog from "./ProxyPinDialog";
import { usePinGatedAction } from "./usePinGatedAction";

// Package picker for a single line item — packages grouped by storage location,
// quantity split must add up to exactly the required quantity (matches old app).
function PackagePicker({ item, shopId, onAssigned, onClose }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  // packageId -> { quantity, storageLocationId }
  const [selections, setSelections] = useState<Record<string, { quantity: number; storageLocationId: string }>>({});

  const productId = item?.snapShotData?.productId;
  const required = item?.purchaseQuantity || 0;

  useEffect(() => {
    if (!productId || !shopId) return;
    setLoading(true);
    Promise.all([
      listStorageLocations([]),
      listMinimalPackages(shopId, productId),
    ])
      .then(([locationsRes, packagesRes]) => {
        const locations = (locationsRes?.data?.data?.locations || []).filter(
          (loc) => loc.isSellableOnPhysicalStore
        );
        const packages = packagesRes?.data?.data?.packages || [];
        const grouped = locations
          .map((location) => ({
            location,
            packages: packages
              .filter((pkg) => (pkg.storageLocationBreakdown?.[location.id] || 0) > 0)
              .map((pkg) => ({ ...pkg, usableQuantity: pkg.storageLocationBreakdown[location.id] })),
          }))
          .filter((g) => g.packages.length > 0);
        setGroups(grouped);
      })
      .catch(() => toast.error("Failed to load packages"))
      .finally(() => setLoading(false));
  }, [productId, shopId]);

  const totalSelected = useMemo(
    () => Object.values(selections).reduce((sum, s) => sum + (s.quantity || 0), 0),
    [selections]
  );

  const togglePackage = (pkg, locationId, checked) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (checked) {
        next[pkg.id] = { quantity: 1, storageLocationId: locationId };
      } else {
        delete next[pkg.id];
      }
      return next;
    });
  };

  const setQuantity = (pkgId, quantity) => {
    setSelections((prev) => ({ ...prev, [pkgId]: { ...prev[pkgId], quantity } }));
  };

  const handleConfirm = () => {
    if (totalSelected !== required) {
      toast.error(`Selected quantity (${totalSelected}) must equal required quantity (${required})`);
      return;
    }
    const packages = Object.entries(selections).map(([packageId, sel]) => ({
      packageId,
      quantity: sel.quantity,
      storageLocationId: sel.storageLocationId,
    }));
    onAssigned(item.itemId, packages);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign Packages — {item?.snapShotData?.productName}</DialogTitle>
          <DialogDescription>
            Required: {required} · Selected:{" "}
            <span className={totalSelected === required ? "text-emerald-600" : "text-destructive"}>
              {totalSelected}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {loading && <div className="py-8 text-center text-muted-foreground">Loading packages...</div>}
          {!loading && groups.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No packages available for this product in sellable storage locations
            </div>
          )}
          {!loading &&
            groups.map((group) => (
              <div key={group.location.id}>
                <div className="mb-2 rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  {group.location.name}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Package</TableHead>
                      <TableHead className="text-center">Usable Qty</TableHead>
                      <TableHead className="text-center">Select Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.packages.map((pkg) => {
                      const selected = Boolean(selections[pkg.id]);
                      return (
                        <TableRow key={pkg.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => togglePackage(pkg, group.location.id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-xs text-muted-foreground">{pkg.advertisedId}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {pkg.usableQuantity} {pkg.uoMShortForm}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={1}
                              max={Math.min(pkg.usableQuantity, required)}
                              disabled={!selected}
                              value={selections[pkg.id]?.quantity ?? 1}
                              onChange={(e) => setQuantity(pkg.id, Number(e.target.value))}
                              className="w-20 mx-auto text-center"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={totalSelected !== required}>
            Assign Packages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AssignPackagesDialog({ open, onClose, preSale, onAssigned }) {
  const { shopId } = useShop();
  const [pickerItem, setPickerItem] = useState(null);
  const [assignedByItem, setAssignedByItem] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const source = preSale?.info?.source;
  const nonPackaged = useMemo(() => getConfirmedLineItems(preSale), [preSale]);
  const packaged = useMemo(() => getPackagedLineItemsFlattened(preSale), [preSale]);
  const allItems = useMemo(() => [...nonPackaged, ...packaged], [nonPackaged, packaged]);

  useEffect(() => {
    if (open) setAssignedByItem({});
  }, [open, preSale?.id]);

  const isAssigned = (itemId) => Boolean(assignedByItem[itemId]?.length);
  const assignedCount = allItems.filter((item) => isAssigned(item.itemId)).length;
  const allAssigned = allItems.length > 0 && assignedCount === allItems.length;

  const submit = async (proxyPin) => {
    setSubmitting(true);
    try {
      const itemsToAllocate = allItems.map((item) => ({
        itemId: item.externalId || item.itemId,
        packages: assignedByItem[item.itemId] || [],
      }));

      const body = {
        shopId,
        preSaleId: preSale.id,
        proxyPin,
        itemsToAllocate,
        // Old app never actually collected payment at this step — it moved
        // the order to processing with defaults and left payment for later.
        virtualPaid: null,
        onlinePaymentMethod: null,
        orderId: null,
        paymentTransactionId: null,
        isPaymentProcessingCompleted: source === "WEEDMAPS" ? true : null,
        cashPaid: null,
        changeAmount: null,
        changeMethod: "CASH",
        storeCreditsUtilized: [],
      };

      await assignPackagesToPreSale(source, body);
      toast.success("Order moved to processing");
      onAssigned?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to move order to processing");
    } finally {
      setSubmitting(false);
    }
  };

  const { run, pinDialogOpen, closePinDialog, submitPin } = usePinGatedAction(submit);

  if (!preSale) return null;

  return (
    <>
      <Dialog open={open && !pickerItem} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Packages — Order #{preSale.advertisedId}</DialogTitle>
            <DialogDescription>
              {assignedCount}/{allItems.length} items assigned
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      <div className="font-medium">{item?.snapShotData?.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.itemType ? `${item.itemType === "parent" ? "Parent" : "Child"} bundle item` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.purchaseQuantity} {item?.snapShotData?.purchaseUoMShortForm}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={isAssigned(item.itemId) ? "default" : "secondary"}>
                        {isAssigned(item.itemId) ? "Assigned" : "Not assigned"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setPickerItem(item)}>
                        {isAssigned(item.itemId) ? "Reassign" : "Assign"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => run()} disabled={!allAssigned || submitting}>
              {submitting ? "Moving..." : "Move to Processing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pickerItem && (
        <PackagePicker
          item={pickerItem}
          shopId={shopId}
          onClose={() => setPickerItem(null)}
          onAssigned={(itemId, packages) =>
            setAssignedByItem((prev) => ({ ...prev, [itemId]: packages }))
          }
        />
      )}

      <ProxyPinDialog
        open={pinDialogOpen}
        onClose={closePinDialog}
        onSubmit={submitPin}
        title="Enter PIN to move order to processing"
      />
    </>
  );
}
