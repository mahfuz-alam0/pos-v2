"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiSelect } from "@/components/ui/api-select";
import { fetchProductsList } from "@/services/products/list";
import { mergeProducts } from "@/services/products/merge";
import type { ProductRow } from "./types";

interface MergeProductsDrawerProps {
  open: boolean;
  onClose: () => void;
  mergeList: ProductRow[];
  onRemove: (productId: string) => void;
  onMerged: () => void;
}

export default function MergeProductsDrawer({ open, onClose, mergeList, onRemove, onMerged }: MergeProductsDrawerProps) {
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [personalPin, setPersonalPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    setTargetProductId(null);
    setPersonalPin("");
    onClose();
  };

  const handleConfirmMerge = async () => {
    if (!targetProductId) return toast.warning("Please select the product you want to keep.");
    if (!personalPin) return toast.warning("Please enter your personal PIN to continue.");

    const productIdsToReplace = mergeList.map((p) => p.id).filter((id) => id !== targetProductId);
    if (productIdsToReplace.length === 0) return toast.warning("The product selected to keep is the only one in the merge list.");

    if (!window.confirm("This process cannot be reversed once completed. Do you want to proceed?")) return;

    setLoading(true);
    try {
      await mergeProducts({ productIdToKeep: targetProductId, productIdsToReplace, personalPin });
      toast.success("Products have been merged successfully.");
      setTargetProductId(null);
      setPersonalPin("");
      onMerged();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong while merging products.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={handleClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="text-base font-semibold">Merge Products</span>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            <p className="font-medium">This merge cannot be undone</p>
            <p className="mt-1 text-xs">
              All selected products will be merged into a single catalog product. Please review carefully before confirming.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold">Selected products</h4>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-input dark:bg-input/30 dark:text-blue-400">
                {mergeList.length} selected
              </span>
            </div>

            {mergeList.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                No products selected. Close this drawer and choose products from the table to merge.
              </div>
            ) : (
              <div className="flex max-h-64 flex-col gap-2 overflow-auto pr-1">
                {mergeList.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 shadow-sm ring-1 ring-foreground/10 transition-colors hover:ring-blue-400"
                  >
                    <div className="mr-2 flex flex-1 items-start gap-2">
                      <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700 dark:bg-input/30 dark:text-blue-400">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.brand?.name || "-"}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => onRemove(product.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-1 font-semibold">Merge into product</div>
            <div className="mb-2 text-xs text-muted-foreground">Choose the product record that will remain in your catalog.</div>
            <ApiSelect
              placeholder="Search and select a product to keep..."
              value={targetProductId}
              onChange={(val) => setTargetProductId(val as string | null)}
              fetchPage={async (page, search) => {
                const res = await fetchProductsList({ page, limit: 20, ...(search ? { search } : {}) });
                return { items: (res?.data ?? []).map((p: any) => ({ id: p.id, name: p.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
              }}
              triggerClassName="w-full"
            />
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-1 font-semibold">Personal PIN</div>
            <div className="mb-2 text-xs text-muted-foreground">Enter your PIN to authorise this irreversible action.</div>
            <Input type="password" placeholder="Enter your PIN to confirm" value={personalPin} onChange={(e) => setPersonalPin(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/30 px-5 py-3">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmMerge} disabled={loading}>
            {loading ? "Merging..." : "Merge"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
