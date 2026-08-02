"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { connectToSocket } from "@/lib/socket";
import { fetchSingleStandaloneTransfer } from "@/services/transfers/getSingleStandalone";
import { markStandaloneTransferInTransit } from "@/services/transfers/markInTransitStandalone";
import { markStandaloneTransferCompleted } from "@/services/transfers/markAsCompletedStandalone";
import { completeOutgoingSupplierTransfer } from "@/services/transfers/completeOutgoingSupplier";
import { completeIncomingSupplierTransfer } from "@/services/transfers/completeIncomingSupplier";
import { createPurchaseOrderFromTransfer } from "@/services/purchaseOrders/createFromTransfer";
import { fetchUomList } from "@/services/uom/list";
import { fetchShopsData } from "@/services/shops/list";
import { fetchInventoriesList } from "@/services/inventories/list";
import { generateExternalPackageId } from "@/services/packages/generateExternalId";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PurchaseOrderAction from "../../PurchaseOrderAction";

const PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "50% Upfront"];

function fmtDateTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
}

export default function TransferDetailsView({ id }: { id: string }) {
  const { shopId } = useShop();

  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uoms, setUoms] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [inventories, setInventories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [markInTransitLoading, setMarkInTransitLoading] = useState(false);
  const [markCompletedLoading, setMarkCompletedLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [showPaymentTermsDialog, setShowPaymentTermsDialog] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<string>("");

  const [progress, setProgress] = useState({ targetCount: 0, progressCount: 0, failedCount: 0, isCompleted: false });
  const socketRef = useRef<any>(null);

  const transferType: "supplier" | "shop" = transfer?.toSupplier || transfer?.fromSupplier ? "supplier" : "shop";

  const loadTransfer = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchSingleStandaloneTransfer(id, shopId);
      const data = res?.data?.transfer;
      setTransfer(data ? { ...data, numberOfPackages: data.transferItems?.length || 0 } : null);
      setItems(data?.transferItems ? [...data.transferItems] : []);
      data?.transferItems?.forEach((item: any, idx: number) => {
        if (item.unitPrice <= 0) {
          toast.warning(
            `Package ${idx + 1} (Metrc Tag: ${item.advertisedPackageId}) has an invalid unit cost: $${(item.unitPrice || 0).toLocaleString()}.`
          );
        }
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load transfer data");
    } finally {
      setLoading(false);
    }
  }, [id, shopId]);

  useEffect(() => {
    loadTransfer();
  }, [loadTransfer]);

  useEffect(() => {
    if (!shopId) return;
    fetchUomList({ page: 1, limit: 300 })
      .then((res) => setUoms(res?.data?.data?.uoms ?? []))
      .catch(() => toast.error("Failed to load UOM data"));
    fetchShopsData().then((res) => setShops(res?.data ?? []));
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    socketRef.current = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/transfers-progress`, shopId });
    socketRef.current?.on("transferProgress", (data: any) => {
      setProgress({
        targetCount: data.targetCount || 0,
        progressCount: data.progressCount || 0,
        failedCount: data.failedCount || 0,
        isCompleted: data.isCompleted,
      });
    });
    return () => socketRef.current?.disconnect();
  }, [shopId]);

  useEffect(() => {
    if (progress.isCompleted) {
      const t = setTimeout(loadTransfer, 5000);
      return () => clearTimeout(t);
    }
  }, [progress.isCompleted, loadTransfer]);

  useEffect(() => {
    if (!shopId || !transfer || transferType !== "supplier" || !transfer.isIncoming) return;
    const productIds = [
      ...new Set(
        (transfer.transferItems ?? [])
          .map((item: any) => item.recommendedProductId || item.sourceId)
          .filter(Boolean)
      ),
    ];
    if (productIds.length === 0) return;
    fetchInventoriesList(shopId, { limit: 30, page: 1, includeProductIds: productIds })
      .then((res) => setInventories(res?.data?.data?.inventories ?? []))
      .catch(() => {});
  }, [shopId, transfer, transferType]);

  const updateItem = (itemId: string, key: string, value: any) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, [key]: value } : it)));
  };

  const handleGenerateId = async (itemId: string) => {
    if (!shopId) return;
    setGeneratingId(itemId);
    try {
      const res = await generateExternalPackageId(shopId);
      updateItem(itemId, "advertisedPackageId", res?.data?.packageId);
      toast.success("New package ID generated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate new package ID");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleMarkInTransit = async () => {
    if (!shopId || !transfer) return;
    setMarkInTransitLoading(true);
    try {
      await markStandaloneTransferInTransit(transfer.id, shopId);
      toast.success("Package successfully marked as transit");
      loadTransfer();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark package in transit");
    } finally {
      setMarkInTransitLoading(false);
    }
  };

  const handleMarkAsCompleted = async (terms?: string) => {
    if (!shopId || !transfer) return;
    setMarkCompletedLoading(true);
    try {
      if (transferType === "supplier") {
        const productPriceRecommendations = items
          .map((item) => {
            const productId = item.recommendedProductId || item.sourceId;
            const inventory = inventories.find((inv) => inv.productId === productId);
            if (!inventory?.unitPrice || inventory.unitPrice <= 0) {
              toast.warning(`Package (Metrc Tag: ${item.advertisedPackageId}) has no valid unit price set.`);
              return null;
            }
            return { productId, price: inventory.unitPrice };
          })
          .filter(Boolean);

        if (productPriceRecommendations.length === 0) {
          toast.error("No valid prices set for transfer items");
          return;
        }

        await completeIncomingSupplierTransfer(shopId, {
          transferId: transfer.id,
          productPriceRecommendations,
        });

        try {
          await createPurchaseOrderFromTransfer(transfer.id, shopId, { paymentTerms: terms });
        } catch (poErr: any) {
          toast.error(poErr?.message || "Transfer completed, but failed to create the Purchase Order");
        }
      } else {
        await markStandaloneTransferCompleted({
          id: transfer.id,
          itemPreferences: items.map((item) => ({
            id: item.sourceId,
            preference: {
              advertisedPackageId: item.advertisedPackageId,
              quantityUoMId: item.quantityUoMId,
              packageCategoryName: item.packageCategoryName,
              packageBrandName: item.packageBrandName,
              packageSupplierId: item.packageSupplierId,
              unitPrice: item.unitPrice,
              name: item.name,
              expiry: item.expiry,
              batchId: null,
              isSample: item.isSample,
              manufacturerSKU: item.manufacturerSKU,
            },
          })),
        });
      }
      toast.success("Package successfully completed");
      loadTransfer();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete the package");
    } finally {
      setMarkCompletedLoading(false);
    }
  };

  const handleMarkAsCompletedOutgoing = async () => {
    if (!shopId || !transfer) return;
    setMarkCompletedLoading(true);
    try {
      await completeOutgoingSupplierTransfer(shopId, { id: transfer.id });
      toast.success("Outgoing transfer successfully completed");
      loadTransfer();
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete outgoing transfer");
    } finally {
      setMarkCompletedLoading(false);
    }
  };

  const confirmMarkAsCompleted = () => {
    if (transferType === "supplier") {
      setPaymentTerms("");
      setShowPaymentTermsDialog(true);
      return;
    }
    handleMarkAsCompleted();
  };

  const allUnitPricesValid = items.every((item) => item.unitPrice && item.unitPrice > 0);
  const allItemsHaveValidPrices = items.every((item) => {
    const productId = item.recommendedProductId || item.sourceId;
    const inventory = inventories.find((inv) => inv.productId === productId);
    return inventory?.unitPrice && inventory.unitPrice > 0;
  });

  if (loading && !transfer) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!transfer) {
    return <div className="p-6 text-center text-muted-foreground">Transfer not found.</div>;
  }

  const fromEntity = transfer.fromShop || transfer.fromSupplier;
  const toEntity = transfer.toShop || transfer.toSupplier;
  const fromIsShop = !!transfer.fromShop;
  const toIsShop = !!transfer.toShop;

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/inventory">Inventory</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/inventory/transfers">Transfers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl p-8 ring-1 ring-foreground/10">
        <div className="flex justify-end gap-2">
          {transfer.isActive ? (
            transfer.isInTransit ? <Badge variant="secondary">In Transit</Badge> : <Badge>Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
          {transfer.isCompleted && <Badge variant="default">Completed</Badge>}
          <Badge variant={transfer.isIncoming ? "default" : "secondary"}>
            {transfer.isIncoming ? "Incoming" : "Outgoing"}
          </Badge>
        </div>

        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-semibold">
            {transfer.isIncoming ? "Incoming" : "Outgoing"} Transfer {transfer.advertisedId}{" "}
            {transfer.isIncoming ? "from" : "to"} {(transfer.isIncoming ? fromEntity : toEntity)?.name || "-"}
          </h2>
          <p className="text-sm text-muted-foreground">Transfer ID: {transfer.advertisedId}</p>
          <p className="text-sm text-muted-foreground">
            Imported by {transfer.creatorInfo?.name} {fmtDateTime(transfer.createdAt)}
          </p>
        </div>

        <div className="h-px bg-border" />

        <div className="my-6 grid grid-cols-3 items-center gap-4">
          <div>
            <h3 className="mb-1 font-semibold">Transfer From</h3>
            <p className="text-sm">{fromEntity?.name || "-"}</p>
            {fromIsShop && (
              <p className="text-sm text-muted-foreground">
                {shops.find((s) => s.id === transfer.fromShop?.id)?.locationString || "-"}
              </p>
            )}
            {!fromIsShop && transfer.fromSupplier && <p className="text-sm text-muted-foreground">Supplier</p>}
          </div>
          <div className="flex justify-center">
            <ArrowRight className="size-8 rounded-full bg-primary p-1.5 text-primary-foreground" />
          </div>
          <div className="text-right">
            <h3 className="mb-1 font-semibold">Transfer To</h3>
            <p className="text-sm">{toEntity?.name || "-"}</p>
            {toIsShop && (
              <p className="text-sm text-muted-foreground">
                {shops.find((s) => s.id === transfer.toShop?.id)?.locationString || "-"}
              </p>
            )}
            {!toIsShop && transfer.toSupplier && <p className="text-sm text-muted-foreground">Supplier</p>}
          </div>
        </div>

        <div className="h-px bg-border" />

        {!transfer.isCompleted && progress.progressCount > 0 && (
          <div className="my-6">
            <p className="mb-2 text-lg">Checking Package Transfer Status</p>
            <Progress value={progress.targetCount > 0 ? (progress.progressCount / progress.targetCount) * 100 : 0} />
            <div className="mt-3 flex flex-col gap-1 text-sm">
              <p><strong>Total Jobs:</strong> {progress.targetCount}</p>
              <p><strong>Completed:</strong> {progress.progressCount}</p>
              <p><strong>Status:</strong> {progress.isCompleted ? "Completed" : "In Progress"}</p>
            </div>
          </div>
        )}

        <div className="h-px bg-border my-6" />

        <p className="mb-4 text-lg">Transfer Items</p>

        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const productId = item.recommendedProductId || item.sourceId;
            const relatedInventory = inventories.find((inv) => inv.productId === productId);
            const associatedProduct = item.associatedProduct;

            return (
              <div key={item.id} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Package ID</p>
                <h3 className="mb-2 text-lg font-semibold">{item.advertisedPackageId}</h3>

                <div className="grid grid-cols-2 gap-2 text-sm sm:max-w-md">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{item.name || "N/A"}</span>
                  <span className="text-muted-foreground">Category:</span>
                  <span>{item.packageCategoryName ?? "N/A"}</span>
                  <span className="text-muted-foreground">Qty:</span>
                  <span>
                    {item.quantityToShift} {uoms.find((u) => item.quantityUoMId === u.id)?.shortForm || ""}
                  </span>
                  <span className="text-muted-foreground">Supplier Name:</span>
                  <span>{item.packageSupplierName || "N/A"}</span>
                </div>

                {transfer.isIncoming && (
                  <>
                    <div className="my-4 h-px bg-border" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-sm">Advertised ID:</p>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Package advertise ID"
                            value={item.advertisedPackageId ?? ""}
                            onChange={(e) => updateItem(item.id, "advertisedPackageId", e.target.value)}
                            disabled={!transfer.isInTransit}
                          />
                          <Button
                            disabled={!transfer.isInTransit || generatingId === item.id}
                            onClick={() => handleGenerateId(item.id)}
                          >
                            {generatingId === item.id && <Loader2 className="size-3.5 animate-spin" />}
                            Generate New
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-sm">Unit Cost:</p>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice ?? ""}
                          onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          disabled={!transfer.isInTransit}
                          placeholder="Unit Price"
                        />
                        {item.unitPrice <= 0 && (
                          <p className="mt-1 text-xs text-orange-500">Warning: Unit price must be greater than 0.</p>
                        )}
                      </div>
                    </div>

                    {transferType === "supplier" && (
                      <div className="mt-4">
                        {associatedProduct ? (
                          <div className="grid grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Associated Product</p>
                              <p>{associatedProduct.name}</p>
                            </div>
                            <div>
                              <p className="font-medium">Net Price</p>
                              <p>${associatedProduct.netPrice.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="font-medium">Margin</p>
                              <p>
                                {(((associatedProduct.netPrice - item.unitPrice) / associatedProduct.netPrice) * 100).toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Profit</p>
                              <p>${(associatedProduct.netPrice - item.unitPrice).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Total Price</p>
                              <p>${(associatedProduct.netPrice * item.quantityToShift).toFixed(2)}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {relatedInventory ? "No associated product found" : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {transfer.isIncoming && transferType === "supplier" && transfer.isCompleted && (
            <PurchaseOrderAction transferId={transfer.id} />
          )}

          {!transfer.isIncoming && !transfer.isInTransit && !transfer.isCompleted && (
            <Button disabled={markInTransitLoading} onClick={handleMarkInTransit}>
              {markInTransitLoading && <Loader2 className="size-3.5 animate-spin" />}
              Mark as in transit
            </Button>
          )}

          {!transfer.isIncoming && transfer.isInTransit && !transfer.isCompleted && transferType === "supplier" && (
            <Button disabled={markCompletedLoading || progress.isCompleted} onClick={handleMarkAsCompletedOutgoing}>
              {markCompletedLoading && <Loader2 className="size-3.5 animate-spin" />}
              Mark as completed
            </Button>
          )}

          {transfer.isIncoming &&
            !transfer.isInTransit &&
            !transfer.isCompleted &&
            (transferType === "supplier" ? (
              allItemsHaveValidPrices ? (
                <AlertDialog>
                  <AlertDialogTrigger>
                    <Button disabled={markCompletedLoading || progress.isCompleted}>
                      {markCompletedLoading && <Loader2 className="size-3.5 animate-spin" />}
                      Mark as completed
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
                      <AlertDialogDescription>Are you sure you want to mark this transfer as completed?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmMarkAsCompleted}>Yes</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button disabled={markCompletedLoading} onClick={confirmMarkAsCompleted}>
                  {markCompletedLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Set Prices to Complete
                </Button>
              )
            ) : (
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button disabled={markCompletedLoading || !allUnitPricesValid || progress.isCompleted}>
                    {markCompletedLoading && <Loader2 className="size-3.5 animate-spin" />}
                    Mark as completed
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Completion</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to mark this transfer as completed?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleMarkAsCompleted()}>Yes</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ))}
        </div>
      </div>

      <Dialog open={showPaymentTermsDialog} onOpenChange={setShowPaymentTermsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Transfer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Completing this transfer will automatically create a Purchase Order for this supplier.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Payment Terms</label>
            <Select value={paymentTerms || undefined} onValueChange={(v) => setPaymentTerms(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentTermsDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!paymentTerms || markCompletedLoading}
              onClick={() => {
                setShowPaymentTermsDialog(false);
                handleMarkAsCompleted(paymentTerms);
              }}
            >
              {markCompletedLoading && <Loader2 className="size-3.5 animate-spin" />}
              Complete & Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
