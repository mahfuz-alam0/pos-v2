"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Inbox, Clock, Trash2, Loader2 } from "lucide-react";

import { fetchInventoriesList } from "@/services/inventories/list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiSelect } from "@/components/ui/api-select";
import type { PendingUpload } from "./ImageUpload";

interface CategoryIconItem {
  id: string;
  iconImage: string | null;
}

export default function CategoryWithIconField({
  value = [],
  onChange,
  fetchPage,
  resolveName,
  onQueueImage,
  pendingUploads = {},
  onRemovePendingImage,
  sectionKey,
  saving,
  shopId,
}: {
  value?: CategoryIconItem[];
  onChange: (value: CategoryIconItem[]) => void;
  fetchPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  resolveName: (id: string) => string;
  onQueueImage: (key: string, file: File, single: boolean) => void;
  pendingUploads?: Record<string, PendingUpload[]>;
  onRemovePendingImage: (key: string, id: string) => void;
  sectionKey: string;
  saving?: boolean;
  shopId?: string | number | null;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [iconDraft, setIconDraft] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [noInventoryCategoryIds, setNoInventoryCategoryIds] = useState<string[]>([]);

  const normalizedValue = (Array.isArray(value) ? value : [])
    .map((item: any) => ({
      id: String(typeof item === "object" ? item?.id : item || "").trim(),
      iconImage: typeof item === "object" ? (item?.iconImage || null) : null,
    }))
    .filter((item) => item.id);

  const selectedIds = normalizedValue.map((item) => item.id);

  const updateList = (list: CategoryIconItem[]) => {
    onChange((Array.isArray(list) ? list : []).map((item) => ({
      id: item.id,
      iconImage: item.iconImage || null,
    })));
  };

  const handleIconChange = (id: string, iconImage: string) => {
    updateList(normalizedValue.map((item) => (item.id === id ? { ...item, iconImage: iconImage || null } : item)));
  };

  const handleDelete = (id: string) => {
    updateList(normalizedValue.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setIconDraft("");
    }
  };

  const startEdit = (id: string) => {
    const current = normalizedValue.find((item) => item.id === id);
    setEditingId(id);
    setIconDraft(current?.iconImage || "");
  };

  const saveEdit = (id: string) => {
    handleIconChange(id, iconDraft);
    setEditingId(null);
    setIconDraft("");
  };

  const handleNewCategorySelect = async (id: string | number | null) => {
    if (id == null) {
      setNewCategoryId(undefined);
      return;
    }
    const idStr = String(id);
    setNewCategoryId(idStr);
    setNoInventoryCategoryIds((ids) => ids.filter((i) => i !== idStr));
    try {
      setInventoryLoading(true);
      const res = await fetchInventoriesList(shopId, { categoryIds: [idStr], limit: 30, page: 1 });
      const total = res?.data?.data?.paginationData?.totalEntries ?? -1;
      if (total === 0) setNoInventoryCategoryIds((ids) => [...ids, idStr]);
    } catch {
      // silent
    } finally {
      setInventoryLoading(false);
    }
  };

  const addCategory = () => {
    if (!newCategoryId) return;
    const id = String(newCategoryId).trim();
    if (!id) return;
    if (selectedIds.includes(id)) {
      toast.warning("Category already added.");
      return;
    }
    updateList([...normalizedValue, { id, iconImage: null }]);
    setNewCategoryId(undefined);
    setNoInventoryCategoryIds((ids) => ids.filter((i) => i !== id));
    setIsAdding(false);
  };

  const isSelectedNoInventory = !!newCategoryId && noInventoryCategoryIds.includes(newCategoryId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">Categories</span>
        <Button size="sm" variant="outline" onClick={() => setIsAdding((prev) => !prev)}>
          {isAdding ? "Cancel" : "Add Category"}
        </Button>
      </div>

      {isAdding && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <ApiSelect
              placeholder="Select category to add"
              value={newCategoryId ?? null}
              onChange={(id) => handleNewCategorySelect(id)}
              fetchPage={fetchPage}
              triggerClassName={`flex-1 w-auto ${isSelectedNoInventory ? "border-destructive" : ""}`}
            />
            {isSelectedNoInventory ? (
              <Button
                variant="outline"
                onClick={() => { setNewCategoryId(undefined); setNoInventoryCategoryIds((ids) => ids.filter((i) => i !== newCategoryId)); }}
              >
                Reset
              </Button>
            ) : (
              <Button onClick={addCategory} disabled={!newCategoryId || inventoryLoading}>Add</Button>
            )}
          </div>
          {isSelectedNoInventory && (
            <div className="text-xs text-destructive">No inventory available for this category. Please reset and select another.</div>
          )}
          {inventoryLoading && !isSelectedNoInventory && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Checking inventory availability...
            </div>
          )}
        </div>
      )}

      {normalizedValue.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3">
          <span className="text-xs text-muted-foreground">No category added yet.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {normalizedValue.map((item) => {
          const uploadKey = `${sectionKey}::categoryIconImage::${item.id}`;
          const pending = pendingUploads[uploadKey] || [];
          const previewImage = pending[0]?.previewUrl || item.iconImage;
          const isEditing = editingId === item.id;

          return (
            <div key={item.id} className="overflow-hidden rounded-[10px] bg-background ring-1 ring-foreground/10">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  {previewImage ? (
                    <img src={previewImage} alt={resolveName(item.id)} className="size-10 shrink-0 rounded object-cover ring-1 ring-foreground/10" />
                  ) : (
                    <div className="size-10 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{resolveName(item.id)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.id}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-auto p-0" onClick={() => startEdit(item.id)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="h-auto p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>Delete</Button>
                </div>
              </div>

              {isEditing && (
                <div className="flex flex-col gap-2 border-t px-3 py-3">
                  <Input value={iconDraft} onChange={(e) => setIconDraft(e.target.value)} placeholder="Paste icon image URL" className="h-9 text-[13px]" />
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-[10px] border-2 border-dashed border-muted-foreground/25 bg-background p-4 text-center hover:bg-muted/30">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={saving}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type?.startsWith("image/")) {
                          toast.error("Only image files allowed.");
                        } else if (file.size / 1024 / 1024 >= 25) {
                          toast.error("Image must be smaller than 25MB.");
                        } else {
                          onQueueImage(uploadKey, file, true);
                        }
                        e.target.value = "";
                      }}
                    />
                    <Inbox className="size-5 text-muted-foreground" />
                    <span className="text-xs">Drop or click to upload icon</span>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setIconDraft(""); }}>Cancel</Button>
                    <Button size="sm" onClick={() => saveEdit(item.id)}>Save</Button>
                  </div>

                  {pending.length > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <img src={pending[0].previewUrl} alt="Pending" className="size-8 rounded object-cover ring-1 ring-primary/40" />
                      <span className="flex items-center gap-1 text-xs text-primary"><Clock className="size-3.5" /> Pending upload</span>
                      <Button size="sm" variant="ghost" className="h-auto p-0 font-semibold text-destructive hover:text-destructive" onClick={() => onRemovePendingImage?.(uploadKey, pending[0].id)}>
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
