"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchRecommendedProduct } from "@/services/packages/getRecommendedProduct";
import { attachPackageToProduct } from "@/services/packages/attachToProduct";
import { fetchProductsList } from "@/services/products/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ApiSelect } from "@/components/ui/api-select";

interface ImportPackageDrawerProps {
  open: boolean;
  onClose: () => void;
  packageDetail: any;
  onImported: () => void;
}

export default function ImportPackageDrawer({
  open,
  onClose,
  packageDetail,
  onImported,
}: ImportPackageDrawerProps) {
  const { shopId } = useShop();

  // Matches ConvertPackageDialog.tsx's convention: absence of metrcData
  // (=== null/undefined) means NOT metrc.
  const isMetrc = packageDetail?.metrcData !== null && packageDetail?.metrcData !== undefined;

  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendedProduct, setRecommendedProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | number | null>(null);
  const [unitCost, setUnitCost] = useState("");
  const [submitting, setSubmitting] = useState<"recommended" | "manual" | null>(null);

  useEffect(() => {
    if (!open || !packageDetail) return;
    setRecommendedProduct(null);
    setSelectedProductId(null);
    setUnitCost(packageDetail?.unitCost ? String(packageDetail.unitCost) : "");
    setSubmitting(null);

    setLoadingRecommendation(true);
    fetchRecommendedProduct({
      id: packageDetail?.id,
      metrcTag: packageDetail?.metrcData?.metrcTag,
      shopId,
    })
      .then((res) => {
        setRecommendedProduct(res?.data?.data?.product ?? res?.data?.data ?? null);
      })
      .catch(() => {
        // No recommendation available — not an error state, just fall through
        // to manual product selection.
        setRecommendedProduct(null);
      })
      .finally(() => setLoadingRecommendation(false));
  }, [open, packageDetail]);

  const fetchProductPage = async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 20, search: search || undefined });
    return {
      items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      totalPages: res?.paginationData?.totalPages ?? 1,
    };
  };

  // Old app (ImportPackage.jsx:847-851) always attaches through the same
  // AttachPackageToProduct call regardless of whether the product came from
  // the recommendation or manual search — "recommended" is just a pre-filled
  // productId, not a different backend action. Match that: one submit path,
  // storage-location breakdown carried over unchanged (locked, matching old's
  // reimport behavior — moving qty between locations goes through Transfers).
  const buildBody = (productId: string | number) => ({
    shopId,
    packageId: packageDetail?.id,
    productId,
    unitCost: unitCost ? parseFloat(unitCost) : null,
    isActive: true,
    storageLocationBreakdown: Object.entries(packageDetail?.storageLocationBreakdown ?? {})
      .filter(([, qty]) => Number(qty) > 0)
      .map(([storageLocationId, qty]) => ({ storageLocationId, quantity: Number(qty) })),
  });

  const submitAttach = async (productId: string | number, mode: "recommended" | "manual") => {
    setSubmitting(mode);
    try {
      await attachPackageToProduct(buildBody(productId), isMetrc);
      toast.success("Package imported successfully");
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to import package");
    } finally {
      setSubmitting(null);
    }
  };

  const handleUseRecommended = () => {
    if (!recommendedProduct?.id) return;
    submitAttach(recommendedProduct.id, "recommended");
  };

  const handleAttachManual = () => {
    if (!selectedProductId) {
      toast.error("Please select a product to attach this package to.");
      return;
    }
    submitAttach(selectedProductId, "manual");
  };

  return (
    <Drawer open={open} onClose={submitting ? undefined : onClose} side="right" size={440}>
      <div className="flex h-full flex-col">
        <div className="px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold leading-tight">Import Package</div>
          <div className="text-xs text-muted-foreground leading-tight">
            Attach this package to a product so it can be sold
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Package Details</h3>
            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Package Name</span>
                <span className="text-xs font-medium">{packageDetail?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Package ID</span>
                <span className="text-xs font-medium">{packageDetail?.advertisedId}</span>
              </div>
            </div>
          </div>

          {loadingRecommendation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Looking for a recommended product...
            </div>
          )}

          {!loadingRecommendation && recommendedProduct && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Recommended Product</h3>
              <Card className="ring-1 ring-primary/30">
                <CardContent className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{recommendedProduct.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {recommendedProduct?.category?.name ?? recommendedProduct?.categoryName ?? ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleUseRecommended}
                    disabled={submitting !== null}
                  >
                    {submitting === "recommended" ? "Attaching..." : "Use this product"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {recommendedProduct ? "Or choose a different product" : "Choose a product"}
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="mb-2">Product</Label>
                <ApiSelect
                  placeholder="Search products..."
                  value={selectedProductId}
                  onChange={(value) => setSelectedProductId(value)}
                  fetchPage={fetchProductPage}
                  triggerClassName="w-full"
                />
              </div>
              <div>
                <Label className="mb-2">Unit Cost</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" disabled={submitting !== null} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selectedProductId || submitting !== null}
            onClick={handleAttachManual}
          >
            {submitting === "manual" ? "Attaching..." : "Attach"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
