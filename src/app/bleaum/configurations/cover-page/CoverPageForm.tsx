"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Store as StoreIcon } from "lucide-react";

import { getCoverPageConfig } from "@/services/coverPage/getCoverPageConfig";
import { saveCoverPageConfig } from "@/services/coverPage/saveCoverPageConfig";
import { listBusinessEntities } from "@/services/businessEntities/list";
import { fetchShopsData } from "@/services/shops/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchProductsList } from "@/services/products/list";
import { fetchBrandsList } from "@/services/brands/list";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";
import { uploadAnyMultipleFiles } from "@/services/storage/uploadMultipleFiles";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

import { SECTION_META, API_KEY_MAP, localSectionToApi, hydrate } from "./coverPageSchema";
import SectionPanel from "./components/SectionPanel";
import type { PendingUpload } from "./ui/ImageUpload";

interface Entity {
  id: string;
  name: string;
  associatedTenantIds?: (string | number)[];
}

interface Shop {
  id: string | number;
  name: string;
}

export default function CoverPageForm() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingUpload[]>>({});
  const [coverPageVisibility, setCoverPageVisibility] = useState(true);
  const [webColor, setWebColor] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopIds, setSelectedShopIds] = useState<(string | number)[]>([]);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | number | null>(null);

  // ── Name resolution caches (id -> name), populated as ApiSelect/fetchPage results stream in ──
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [brandNames, setBrandNames] = useState<Record<string, string>>({});

  // ── Entity → scoped shop list ─────────────────────────────────────────────
  const selectedEntity = entities.find((entity) => entity.id === selectedEntityId);
  const entityShops = selectedEntity
    ? shops.filter((shop) => (selectedEntity.associatedTenantIds || []).includes(shop.id))
    : shops;

  // ── Load config when shop or entity changes ─────────────────────────────
  useEffect(() => {
    if (!selectedShopId) return;
    setLoading(true);
    getCoverPageConfig(selectedShopId, selectedEntityId)
      .then((res) => {
        const data = res?.data?.data ?? {};
        if (typeof data.coverPageVisiblity === "boolean") setCoverPageVisibility(data.coverPageVisiblity);
        setWebColor(data.webColor ?? null);
        const sections = data.sections ?? {};
        setConfig(Object.keys(sections).length ? hydrate(sections) : {});
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load cover page config"))
      .finally(() => setLoading(false));
  }, [selectedShopId, selectedEntityId]);

  useEffect(() => {
    fetchShopsData().then((res) => {
      const list = res?.data ?? [];
      setShops(list);
      if (!selectedShopId && list.length) setSelectedShopId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setEntitiesLoading(true);
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities || []))
      .catch(() => {})
      .finally(() => setEntitiesLoading(false));
  }, []);

  const handleEntityChange = (entityId: string | null) => {
    setSelectedEntityId(entityId ?? null);
    const entity = entities.find((e) => e.id === entityId);
    const scopedShops = entity
      ? shops.filter((shop) => (entity.associatedTenantIds || []).includes(shop.id))
      : shops;
    setSelectedShopId(scopedShops[0]?.id ?? null);
  };

  // ── ApiSelect fetchPage adapters (also populate the name-resolution caches) ──
  const categoryFetchPage = async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 20, ...(search ? { search } : {}) });
    const items = (res?.data ?? []).map((c: any) => ({ id: String(c.id), name: c.name || c.classification?.name || "Unnamed" }));
    setCategoryNames((prev) => ({ ...prev, ...Object.fromEntries(items.map((i: any) => [i.id, i.name])) }));
    return { items, totalPages: res?.paginationData?.totalPages || 1 };
  };

  const productFetchPage = async (page: number, search: string) => {
    const res = await fetchProductsList({ page, limit: 20, ...(search ? { search } : {}) });
    const items = (res?.data ?? []).map((p: any) => ({ id: String(p.id), name: p.name || "Unnamed" }));
    setProductNames((prev) => ({ ...prev, ...Object.fromEntries(items.map((i: any) => [i.id, i.name])) }));
    return { items, totalPages: res?.paginationData?.totalPages || 1 };
  };

  const brandFetchPage = async (page: number, search: string) => {
    const res = await fetchBrandsList({ page, limit: 20, ...(search ? { search } : {}) });
    const items = (res?.data ?? []).map((b: any) => ({ id: String(b.id), name: b.name || "Unnamed" }));
    setBrandNames((prev) => ({ ...prev, ...Object.fromEntries(items.map((i: any) => [i.id, i.name])) }));
    return { items, totalPages: res?.paginationData?.totalPages || 1 };
  };

  const resolveCategoryName = (id: string) => categoryNames[id] || id;
  const resolveProductName = (id: string) => productNames[id] || id;
  const resolveBrandName = (id: string) => brandNames[id] || id;

  // ── Config change handlers ───────────────────────────────────────────────
  const handleFieldChange = (section: string, field: string, value: any) =>
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

  const handleToggle = (section: string, visible: boolean) =>
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], visible } }));

  // ── Image queue handlers ─────────────────────────────────────────────────
  const handleQueueImage = (key: string, file: File, single = false) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const previewUrl = URL.createObjectURL(file);

    setPendingUploads((prev) => {
      if (single) {
        const existing = prev[key] || [];
        existing.forEach((item) => { if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl); });
        return { ...prev, [key]: [{ id, file, previewUrl }] };
      }
      return { ...prev, [key]: [...(prev[key] || []), { id, file, previewUrl }] };
    });
  };

  const handleRemovePendingImage = (key: string, imageId: string) => {
    setPendingUploads((prev) => {
      const items = prev[key] || [];
      const toRemove = items.find((item) => item.id === imageId);
      if (toRemove?.previewUrl) URL.revokeObjectURL(toRemove.previewUrl);
      return { ...prev, [key]: items.filter((item) => item.id !== imageId) };
    });
  };

  const handleReindexReviewUploads = (sectionKey: string, removedIndex: number) => {
    const prefix = `${sectionKey}::reviews::`;
    setPendingUploads((prev) => {
      const next: Record<string, PendingUpload[]> = {};
      Object.entries(prev).forEach(([key, items]) => {
        if (!key.startsWith(prefix)) { next[key] = items; return; }

        const idx = Number(key.slice(prefix.length));
        if (Number.isNaN(idx)) { next[key] = items; return; }

        if (idx === removedIndex) {
          (items || []).forEach((item) => { if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl); });
          return;
        }

        const targetKey = idx > removedIndex ? `${prefix}${idx - 1}` : key;
        next[targetKey] = [...(next[targetKey] || []), ...(items || [])];
      });
      return next;
    });
  };

  // ── File upload helpers ──────────────────────────────────────────────────
  const uploadQueuedFiles = async (files: PendingUpload[]): Promise<string[]> => {
    const validFiles = (files || []).filter((item) => item?.file);
    if (!validFiles.length) return [];

    if (validFiles.length === 1) {
      const res = await uploadAnySingleFile(validFiles[0].file);
      if (res?.downloadUrl) return [res.downloadUrl];
      throw new Error("No URL returned from single file upload");
    }

    const res = await uploadAnyMultipleFiles(validFiles.map((item) => item.file));
    const urls = (res || []).map((row) => row?.downloadUrl).filter(Boolean) as string[];
    if (urls.length) return urls;
    throw new Error("No URLs returned from multiple file upload");
  };

  // ── Patch uploaded URLs into config ──────────────────────────────────────
  const patchUploadsIntoConfig = async (baseConfig: Record<string, any>) => {
    let configToSave = { ...baseConfig };
    const uploadEntries = Object.entries(pendingUploads).filter(([, files]) => (files || []).length > 0);

    for (const [compositeKey, files] of uploadEntries) {
      const uploadedUrls = await uploadQueuedFiles(files);
      if (!uploadedUrls.length) continue;

      const [sectionKey, fieldName, thirdPart] = compositeKey.split("::");

      if (fieldName === "reviews" && thirdPart !== undefined) {
        const reviewIndex = Number(thirdPart);
        if (!Number.isNaN(reviewIndex)) {
          const existingReviews = Array.isArray(configToSave?.[sectionKey]?.reviews) ? configToSave[sectionKey].reviews : [];
          const updatedReviews = [...existingReviews];
          if (updatedReviews[reviewIndex]) {
            updatedReviews[reviewIndex] = { ...updatedReviews[reviewIndex], image: uploadedUrls[0] };
            configToSave = { ...configToSave, [sectionKey]: { ...configToSave[sectionKey], reviews: updatedReviews } };
          }
        }
        continue;
      }

      if (fieldName === "categoryIconImage" && thirdPart) {
        const existingCatIds = Array.isArray(configToSave?.[sectionKey]?.categoryIds) ? configToSave[sectionKey].categoryIds : [];
        const updatedCatIds = existingCatIds.map((item: any) => {
          const itemId = typeof item === "object" ? item.id : item;
          return itemId === thirdPart ? { ...(typeof item === "object" ? item : { id: item }), iconImage: uploadedUrls[0] } : item;
        });
        configToSave = { ...configToSave, [sectionKey]: { ...configToSave[sectionKey], categoryIds: updatedCatIds } };
        continue;
      }

      if (fieldName) {
        const isArrayField = ["bgImageUrls", "mobileBanner", "videoUrls", "mobileVideoUrls", "imageUrls"].includes(fieldName);
        configToSave = {
          ...configToSave,
          [sectionKey]: {
            ...configToSave[sectionKey],
            [fieldName]: isArrayField
              ? [...(configToSave[sectionKey]?.[fieldName] || []), ...uploadedUrls]
              : uploadedUrls[0],
          },
        };
      }
    }

    return configToSave;
  };

  const buildSectionsPayload = (configToSave: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(API_KEY_MAP).map(([localKey, apiKey]) => [apiKey, localSectionToApi(localKey, configToSave[localKey])])
    );

  const cleanupPendingUploads = () => {
    Object.values(pendingUploads).flat().forEach((item) => {
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingUploads({});
  };

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedShopId) return toast.error("Missing shop. Please refresh and try again.");

    setSaving(true);
    try {
      const configToSave = await patchUploadsIntoConfig(config);
      const sections = buildSectionsPayload(configToSave);

      const res = await saveCoverPageConfig({
        shopId: selectedShopId,
        coverPageVisiblity: coverPageVisibility,
        sections,
        webColor: webColor || null,
        businessEntityId: selectedEntityId || null,
      });

      toast.success("Cover page config saved successfully");
      const saved = res?.data?.data?.sections ?? {};
      if (Object.keys(saved).length) setConfig(hydrate(saved));
      cleanupPendingUploads();
    } catch (err: any) {
      toast.error(err?.message || "Failed while uploading images or saving configuration");
    } finally {
      setSaving(false);
    }
  };

  // ── Multi-shop save handler ─────────────────────────────────────────────
  const handleMultiShopSave = async () => {
    if (!selectedShopIds.length) return;

    setSaving(true);
    try {
      const configToSave = await patchUploadsIntoConfig(config);
      const sections = buildSectionsPayload(configToSave);

      const results = await Promise.allSettled(
        selectedShopIds.map((shopId) =>
          saveCoverPageConfig({
            shopId,
            coverPageVisiblity: coverPageVisibility,
            sections,
            webColor: webColor || null,
            businessEntityId: selectedEntityId || null,
          })
        )
      );

      const succeeded = results.filter((r) => r.status === "fulfilled");
      const failed = results
        .map((r, i) => ({ r, shopId: selectedShopIds[i] }))
        .filter(({ r }) => r.status === "rejected");

      if (succeeded.length) {
        toast.success(`Config saved to ${succeeded.length} shop${succeeded.length !== 1 ? "s" : ""} successfully`);
        cleanupPendingUploads();
      }
      if (failed.length) {
        const failedNames = failed.map(({ shopId }) => shops.find((s) => s.id === shopId)?.name || shopId).join(", ");
        toast.error(`Failed to save config for: ${failedNames}`);
      }

      setShopModalOpen(false);
      setSelectedShopIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed while uploading images or saving configuration");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────
  const sectionKeys = Object.keys(SECTION_META);
  const visibleCount = Object.values(config).filter((s: any) => s.visible).length;
  const activeData = config[activeSection];
  const activeMeta = SECTION_META[activeSection];
  const ActiveIcon = activeMeta?.icon;
  const otherShops = entityShops.filter((s) => s.id !== selectedShopId);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {/* ── Page header ── */}
        <div className="border-b border-foreground/10">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
            <div>
              <h4 className="text-[15px] font-bold">Cover Page Configuration</h4>
              <p className="text-xs text-muted-foreground">Manage visibility, content and colors for each ecom home section</p>
            </div>
            <Badge className="rounded-full bg-emerald-600 text-white">
              {visibleCount} / {sectionKeys.length} visible
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={[{ value: "__all__", label: "All entities" }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
                value={selectedEntityId ?? "__all__"}
                onValueChange={(v) => handleEntityChange(v === "__all__" ? null : v)}
              >
                <SelectTrigger className="w-55" disabled={entitiesLoading}>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All entities</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={entityShops.map((s) => ({ value: String(s.id), label: s.name }))}
                value={selectedShopId != null ? String(selectedShopId) : ""}
                onValueChange={(v) => setSelectedShopId(v)}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  {entityShops.map((shop) => (
                    <SelectItem key={shop.id} value={String(shop.id)}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-8 items-center gap-2 rounded-lg bg-muted/50 px-3">
                <div className="relative size-5 shrink-0 overflow-hidden rounded ring-1 ring-foreground/10" style={{ background: webColor || "#000000" }}>
                  <input
                    type="color"
                    value={webColor || "#000000"}
                    onChange={(e) => setWebColor(e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer border-none p-0 opacity-0"
                  />
                </div>
                <span className="text-xs font-medium">Web Color{webColor ? ` (${webColor})` : ""}</span>
              </div>

              <div className="flex h-8 items-center gap-2 rounded-lg bg-muted/50 px-3">
                {coverPageVisibility ? <Eye className="size-3.5 text-emerald-600" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                <span className="text-xs font-medium">Cover Page</span>
                <Switch size="sm" checked={coverPageVisibility} onCheckedChange={setCoverPageVisibility} />
              </div>

              <Button onClick={handleSave} disabled={saving}>
                <Save className="size-4" /> {saving ? "Saving..." : "Save Changes"}
              </Button>

              {entityShops.length > 1 && (
                <Button variant="outline" onClick={() => setShopModalOpen(true)} disabled={saving}>
                  <StoreIcon className="size-4" /> Apply to Shops
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Body: sidebar + content panel ── */}
        <div className="flex min-h-[580px] flex-col lg:flex-row">
          <div className="flex flex-row flex-wrap gap-0.5 border-b border-foreground/10 bg-muted/30 px-2 py-3 lg:w-55 lg:min-w-55 lg:flex-col lg:border-b-0 lg:border-r">
            {sectionKeys.map((key) => {
              const meta = SECTION_META[key];
              const Icon = meta.icon;
              const isActive = activeSection === key;
              const isVisible = config[key]?.visible ?? true;

              return (
                <div
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-all lg:w-full ${
                    isActive ? "bg-background shadow-[0_1px_4px_rgba(0,0,0,0.08)] ring-1 ring-foreground/10" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                    <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : isVisible ? "" : "text-muted-foreground"}`} />
                    <span className={`overflow-hidden text-xs text-ellipsis whitespace-nowrap ${isActive ? "font-semibold text-primary" : ""} ${!isVisible ? "text-muted-foreground line-through" : ""}`}>
                      {meta.label}
                    </span>
                  </div>
                  <Switch
                    size="sm"
                    checked={isVisible}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-7 lg:px-8">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  {ActiveIcon && <ActiveIcon className="size-5" />}
                </div>
                <div>
                  <h5 className="text-[15px] font-bold">{activeMeta?.label}</h5>
                  <p className="text-xs text-muted-foreground">Section {sectionKeys.indexOf(activeSection) + 1} of {sectionKeys.length}</p>
                </div>
              </div>

              {activeData?.visible ? (
                <Badge className="rounded-full bg-emerald-600 text-white"><Eye className="size-3" /> Visible</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full"><EyeOff className="size-3" /> Hidden</Badge>
              )}
            </div>

            {!activeData?.visible && (
              <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-700 dark:text-amber-400">
                <EyeOff className="size-4 shrink-0" />
                This section is hidden on the live site. Toggle it in the sidebar to make it visible.
              </div>
            )}

            {loading ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className={activeData?.visible ? "" : "opacity-50"}>
                <SectionPanel
                  sectionKey={activeSection}
                  data={activeData}
                  onChange={handleFieldChange}
                  onQueue={handleQueueImage}
                  onRemovePending={handleRemovePendingImage}
                  onReindexReviewUploads={handleReindexReviewUploads}
                  pendingUploads={pendingUploads}
                  saving={saving}
                  shopId={selectedShopId}
                  categoryFetchPage={categoryFetchPage}
                  resolveCategoryName={resolveCategoryName}
                  brandFetchPage={brandFetchPage}
                  resolveBrandName={resolveBrandName}
                  productFetchPage={productFetchPage}
                  resolveProductName={resolveProductName}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={shopModalOpen} onOpenChange={(open) => { if (!open) { setShopModalOpen(false); setSelectedShopIds([]); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Configuration to Other Shops</DialogTitle>
            <DialogDescription>Copy the current section configuration to other shops in this entity.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-emerald-600/10 px-4 py-3">
            <span className="mb-1 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">Copying configuration from</span>
            <div className="flex items-center gap-2">
              <StoreIcon className="size-4 text-emerald-600" />
              <span className="text-sm font-bold">{entityShops.find((s) => s.id === selectedShopId)?.name || "Current Shop"}</span>
              <Badge variant="secondary" className="ml-auto rounded-full text-xs">Source</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Apply to</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {otherShops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other shops available.</p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedShopIds.length === otherShops.length && otherShops.length > 0}
                  onCheckedChange={(checked) => setSelectedShopIds(checked ? otherShops.map((s) => s.id) : [])}
                />
                Select All ({otherShops.length} shop{otherShops.length !== 1 ? "s" : ""})
              </label>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {otherShops.map((shop) => (
                  <label key={shop.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedShopIds.includes(shop.id)}
                      onCheckedChange={(checked) =>
                        setSelectedShopIds((prev) => (checked ? [...prev, shop.id] : prev.filter((id) => id !== shop.id)))
                      }
                    />
                    {shop.name}
                  </label>
                ))}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShopModalOpen(false); setSelectedShopIds([]); }} disabled={saving}>Cancel</Button>
            <Button onClick={handleMultiShopSave} disabled={!selectedShopIds.length || saving}>
              {saving ? "Saving..." : `Apply to ${selectedShopIds.length} Shop${selectedShopIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
