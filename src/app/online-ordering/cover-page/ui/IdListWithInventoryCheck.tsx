"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, type LucideIcon } from "lucide-react";

import { fetchInventoriesList } from "@/services/inventories/list";
import { Button } from "@/components/ui/button";
import { ApiSelect } from "@/components/ui/api-select";

export default function IdListWithInventoryCheck({
  label, addLabel, icon: Icon,
  value, onChange, resolveName, fetchPage,
  inventoryParamKey, shopId,
}: {
  label: string;
  addLabel: string;
  icon: LucideIcon;
  value: string[];
  onChange: (ids: string[]) => void;
  resolveName: (id: string) => string;
  fetchPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  inventoryParamKey: "categoryIds" | "brandIds" | "includeProductIds";
  shopId?: string | number | null;
}) {
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [noInventoryIds, setNoInventoryIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newId, setNewId] = useState<string | undefined>(undefined);

  const selectedIds = Array.isArray(value) ? value : [];

  const handleNewSelect = async (id: string | number | null) => {
    if (id == null) {
      setNewId(undefined);
      return;
    }
    const idStr = String(id);
    setNewId(idStr);
    try {
      setInventoryLoading(true);
      const res = await fetchInventoriesList(shopId, { [inventoryParamKey]: [idStr], limit: 30, page: 1 });
      const total = res?.data?.data?.paginationData?.totalEntries ?? -1;
      if (total === 0) {
        setNoInventoryIds((ids) => [...ids, idStr]);
      } else {
        setNoInventoryIds((ids) => ids.filter((i) => i !== idStr));
      }
    } catch {
      // silent
    } finally {
      setInventoryLoading(false);
    }
  };

  const addItem = () => {
    if (!newId) return;
    const id = String(newId).trim();
    if (!id || selectedIds.includes(id)) {
      toast.warning(`${label.replace(/s$/, "")} already added.`);
      return;
    }
    onChange([...selectedIds, id]);
    setNewId(undefined);
    setIsAdding(false);
  };

  const removeItem = (id: string) => {
    onChange(selectedIds.filter((i) => i !== id));
    setNoInventoryIds((ids) => ids.filter((i) => i !== id));
  };

  const isSelectedNoInventory = !!newId && noInventoryIds.includes(newId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Selected {label}</span>
        <Button size="sm" variant="outline" onClick={() => setIsAdding((prev) => !prev)}>
          {isAdding ? "Cancel" : addLabel}
        </Button>
      </div>

      {isAdding && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <ApiSelect
              placeholder={`Select ${label.toLowerCase().replace(/s$/, "")} to add`}
              value={newId ?? null}
              onChange={handleNewSelect}
              fetchPage={fetchPage}
              triggerClassName={`flex-1 w-auto ${isSelectedNoInventory ? "border-destructive" : ""}`}
            />
            {isSelectedNoInventory ? (
              <Button variant="outline" onClick={() => { setNewId(undefined); setNoInventoryIds((ids) => ids.filter((i) => i !== newId)); }}>
                Reset
              </Button>
            ) : (
              <Button onClick={addItem} disabled={!newId || inventoryLoading}>Add</Button>
            )}
          </div>
          {isSelectedNoInventory && (
            <div className="text-xs text-destructive">
              No inventory available for this {label.toLowerCase().replace(/s$/, "")}. Please reset and select another.
            </div>
          )}
          {inventoryLoading && !isSelectedNoInventory && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Checking inventory availability...
            </div>
          )}
        </div>
      )}

      {selectedIds.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3">
          <span className="text-xs text-muted-foreground">No {label.toLowerCase().replace(/s$/, "")} added yet.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selectedIds.map((id) => {
          const isNoInventory = noInventoryIds.includes(id);
          return (
            <div
              key={id}
              className={`overflow-hidden rounded-[10px] bg-background ring-1 ${isNoInventory ? "ring-destructive/60" : "ring-foreground/10"}`}
            >
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                    <Icon className="size-4.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <span className={`block truncate text-sm font-semibold ${isNoInventory ? "text-destructive" : ""}`}>
                      {resolveName(id)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{id}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-auto shrink-0 p-0 text-destructive hover:text-destructive" onClick={() => removeItem(id)}>
                  Delete
                </Button>
              </div>
              {isNoInventory && (
                <div className="border-t border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                  No inventory available — please remove and select another.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
