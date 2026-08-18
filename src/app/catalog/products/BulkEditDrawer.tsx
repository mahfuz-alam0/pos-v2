"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { bulkUpdateProductProps } from "@/services/products/bulkUpdateProps";
import { bulkUpdateInventoryProps } from "@/services/inventories/bulkUpdateProps";
import { fetchBrandsList } from "@/services/brands/list";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchTagsList } from "@/services/tags/list";
import { fetchStrainsList } from "@/services/strains/list";
import { fetchPricingTemplates } from "@/services/pricingTemplates";
import { fetchUomList } from "@/services/uom/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiSelect } from "@/components/ui/api-select";
import { MultiApiSelect } from "@/components/ui/multi-api-select";

import { Field, Section, ImagesUpload, type UploadedImage } from "./ProductFormFields";
import type { ProductRow } from "./types";

interface BulkEditDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedProducts: ProductRow[];
  onSaved: () => void;
  /**
   * Inventory ids for the same selection. When passed, the drawer also offers the
   * "Edit Pricing Details" tab, which updates inventories rather than products.
   */
  inventoryIds?: string[];
}

type MergeStrategy = "APPEND" | "REPLACE" | "REMOVE";

function SegmentToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: NoInfer<T>) => void;
}) {
  return (
    <div className="flex w-full rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-[7px] px-2 py-1 text-xs font-medium transition-colors ${
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Same button sizing as the page-level action buttons in ManageInventoriesTable / ProductsPage. */
const ACTION_BUTTON = "h-9! rounded! px-3.5! text-[14px]! font-normal!";
/** Inputs/selects in this drawer sit taller than the app-wide h-8 default. */
const FIELD_HEIGHT = "h-10!";

function Hint({ label, hint }: { label: string; hint: string }) {
  return (
    <>
      {label} <span className="text-xs font-normal text-muted-foreground">{hint}</span>
    </>
  );
}

const MERGE_STRATEGY_OPTIONS: { value: MergeStrategy; label: string }[] = [
  { value: "APPEND", label: "Add to existing" },
  { value: "REPLACE", label: "Replace" },
  { value: "REMOVE", label: "Remove" },
];

type PricingMode = "manual" | "template";
const PRICING_MODE_OPTIONS: { value: PricingMode; label: string }[] = [
  { value: "manual", label: "Manual pricing" },
  { value: "template", label: "Apply pricing template" },
];

export default function BulkEditDrawer({ open, onClose, selectedProducts, onSaved, inventoryIds }: BulkEditDrawerProps) {
  const { shopId } = useShop();
  const hasPricingTab = Array.isArray(inventoryIds) && inventoryIds.length > 0;
  const [tab, setTab] = useState("product");

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [brandId, setBrandId] = useState<string | undefined>(undefined);
  const [strainIds, setStrainIds] = useState<string[]>([]);
  const [strainStrategy, setStrainStrategy] = useState<MergeStrategy>("APPEND");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagStrategy, setTagStrategy] = useState<MergeStrategy>("APPEND");
  const [details, setDetails] = useState("");
  const [highlights, setHighlights] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);

  const [pricingMode, setPricingMode] = useState<PricingMode>("manual");
  const [unitPrice, setUnitPrice] = useState("");
  const [pricingTemplates, setPricingTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [enableConversion, setEnableConversion] = useState(false);
  const [projectedQtyUomId, setProjectedQtyUomId] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [uoms, setUoms] = useState<any[]>([]);

  const selectedTemplate = pricingTemplates.find((t) => t.id === selectedTemplateId) ?? null;

  useEffect(() => {
    if (!open) return;
    setTab("product");
    setCategoryId(undefined);
    setBrandId(undefined);
    setStrainIds([]);
    setStrainStrategy("APPEND");
    setTagIds([]);
    setTagStrategy("APPEND");
    setDetails("");
    setHighlights("");
    setImages([]);
    setPricingMode("manual");
    setUnitPrice("");
    setSelectedTemplateId("");
    setEnableConversion(false);
    setProjectedQtyUomId("");
    setConversionRate("");
  }, [open]);

  useEffect(() => {
    if (!open || !hasPricingTab) return;
    setTemplatesLoading(true);
    fetchPricingTemplates(shopId, undefined)
      .then((res) => setPricingTemplates(res?.data?.data?.templates ?? []))
      .catch((err: any) => toast.error(err?.message || "Failed to load pricing templates"))
      .finally(() => setTemplatesLoading(false));
    fetchUomList({ page: 1, limit: 300 })
      .then((res) => setUoms(res?.data?.data?.uoms ?? []))
      .catch(() => setUoms([]));
  }, [open, hasPricingTab, shopId]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.warning("No products selected");
      return;
    }

    const payload: Record<string, any> = { ids: selectedProducts.map((p) => p.id) };
    if (categoryId !== undefined) payload.categoryId = categoryId;
    if (brandId !== undefined) payload.brandId = brandId;
    if (strainIds.length > 0) {
      payload.strainIds = strainIds;
      payload.strainsMergeStrategy = strainStrategy;
    }
    if (tagIds.length > 0) {
      payload.tagIds = tagIds;
      payload.tagsMergeStrategy = tagStrategy;
    }
    if (details.trim()) payload.details = details.trim();
    if (highlights.trim()) payload.highlights = highlights.trim();
    if (images.length > 0) payload.images = images.map((img, i) => ({ url: img.url, order: i }));

    if (Object.keys(payload).length === 1) {
      toast.warning("Change at least one field before saving");
      return;
    }

    setSaving(true);
    try {
      await bulkUpdateProductProps(shopId as string | null, payload);
      toast.success(`${selectedProducts.length} product(s) updated successfully`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update products");
    } finally {
      setSaving(false);
    }
  };

  const handlePricingSubmit = async () => {
    if (pricingMode === "manual" && !unitPrice.trim()) {
      toast.warning("Enter a unit price");
      return;
    }
    if (pricingMode === "template" && !selectedTemplateId) {
      toast.warning("Select a pricing template");
      return;
    }
    if (enableConversion && (!projectedQtyUomId || !conversionRate.trim())) {
      toast.warning("Pick a target unit of measure and a conversion rate");
      return;
    }

    const templatePricing = selectedTemplate?.pricingInfo;
    const payload = {
      shopId,
      ids: inventoryIds,
      unitPrice: pricingMode === "manual" ? Number(unitPrice) : (templatePricing?.unitPrice ?? null),
      isTieredPricingApplicable:
        pricingMode === "template" ? Boolean(templatePricing?.isTieredPricingApplicable) : false,
      tieredPricingDetails:
        pricingMode === "template" && templatePricing
          ? {
              measurementType: templatePricing.tieredPricingMeasurementType || "AMOUNT",
              tiers: templatePricing.tiers ?? [],
            }
          : { measurementType: "AMOUNT", tiers: [] },
      pricingTemplateId: pricingMode === "template" ? selectedTemplateId : null,
      projectedQtyUomId: enableConversion ? projectedQtyUomId : null,
      projectedQtyConversionRate: enableConversion ? Number(conversionRate) : null,
    };

    setSaving(true);
    try {
      await bulkUpdateInventoryProps(payload);
      toast.success(`Pricing updated for ${inventoryIds!.length} product(s)`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  const fetchCategoryPage = async (page: number, search: string) => {
    const res = await fetchCategoriesList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };
  const fetchBrandPage = async (page: number, search: string) => {
    const res = await fetchBrandsList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((b: any) => ({ id: b.id, name: b.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };
  const fetchStrainPage = async (page: number, search: string) => {
    const res = await fetchStrainsList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((s: any) => ({ id: s.id, name: s.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };
  const fetchTagPage = async (page: number, search: string) => {
    const res = await fetchTagsList({ page, limit: 10, search } as any);
    return { items: (res?.data ?? []).map((t: any) => ({ id: t.id, name: t.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
  };

  return (
    <Drawer open={open} onClose={handleClose} side="right" size={hasPricingTab ? 800 : 480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <span className="text-base font-semibold">
            {hasPricingTab ? "Manage Bulk Products" : `Bulk Edit (${selectedProducts.length})`}
          </span>
          <Button variant="outline" size="icon-sm" onClick={handleClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <Tabs value={tab} onValueChange={setTab}>
            {hasPricingTab && (
              <div className="mb-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                <TabsList variant="line" className="h-auto gap-7 p-0">
                  <TabsTrigger value="product">Edit Product Details</TabsTrigger>
                  <TabsTrigger value="pricing">Edit Pricing Details</TabsTrigger>
                </TabsList>
              </div>
            )}

            <TabsContent value="product" className="flex flex-col gap-4">
              <Section title="Basic Information">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category">
                      <ApiSelect
                        placeholder="Select Category"
                        value={categoryId ?? null}
                        onChange={(val) => setCategoryId((val as string) ?? undefined)}
                        fetchPage={fetchCategoryPage}
                        triggerClassName={`w-full ${FIELD_HEIGHT}`}
                      />
                    </Field>

                    <Field label="Brand">
                      <ApiSelect
                        placeholder="Select Brand"
                        value={brandId ?? null}
                        onChange={(val) => setBrandId((val as string) ?? undefined)}
                        fetchPage={fetchBrandPage}
                        triggerClassName={`w-full ${FIELD_HEIGHT}`}
                      />
                    </Field>
                  </div>

                  <Field label="Strains">
                    <MultiApiSelect
                      placeholder="Select Strain"
                      value={strainIds}
                      onChange={setStrainIds}
                      fetchPage={fetchStrainPage}
                      triggerClassName={`w-full ${FIELD_HEIGHT}`}
                    />
                    {strainIds.length > 0 && (
                      <div className="mt-1.5">
                        <SegmentToggle options={MERGE_STRATEGY_OPTIONS} value={strainStrategy} onChange={setStrainStrategy} />
                      </div>
                    )}
                  </Field>

                  <Field label="Tags">
                    <MultiApiSelect
                      placeholder="Select Tag"
                      value={tagIds}
                      onChange={setTagIds}
                      fetchPage={fetchTagPage}
                      triggerClassName={`w-full ${FIELD_HEIGHT}`}
                    />
                    {tagIds.length > 0 && (
                      <div className="mt-1.5">
                        <SegmentToggle options={MERGE_STRATEGY_OPTIONS} value={tagStrategy} onChange={setTagStrategy} />
                      </div>
                    )}
                  </Field>
                </div>
              </Section>

              <Section title="Description & Content">
                <div className="flex flex-col gap-4">
                  <Field label={<Hint label="Product Details" hint="(Full product description)" />}>
                    <Textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Enter comprehensive product details and specifications"
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{details.length} / 1000</p>
                  </Field>

                  <Field label={<Hint label="Product Highlights" hint="(Key features & benefits)" />}>
                    <Textarea
                      value={highlights}
                      onChange={(e) => setHighlights(e.target.value)}
                      placeholder="Enter key features, benefits, and highlights"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{highlights.length} / 500</p>
                  </Field>
                </div>
              </Section>

              <Section title="Product Images">
                <ImagesUpload images={images} onChange={setImages} />
                {images.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    These images replace the existing images on all selected products.
                  </p>
                )}
              </Section>

              <p className="text-xs text-muted-foreground">
                Changes apply to all {selectedProducts.length} selected products. Leave a field untouched to keep it as-is.
              </p>
            </TabsContent>

            {hasPricingTab && (
              <TabsContent value="pricing" className="flex flex-col gap-4">
                <div className="rounded-xl bg-primary/5 p-4 ring-1 ring-primary/20">
                  <div className="mb-3 text-sm font-semibold text-foreground">Pricing Method</div>
                  <div className="flex flex-wrap gap-6">
                    {PRICING_MODE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="radio"
                          name="bulk-pricing-mode"
                          checked={pricingMode === opt.value}
                          onChange={() => setPricingMode(opt.value)}
                          className="size-4 shrink-0 accent-primary"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {pricingMode === "manual" ? (
                  <Section title="Manual Pricing Details">
                    <div className="flex items-center justify-between gap-4 py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                      <span className="text-sm font-medium text-muted-foreground">Unit Price:</span>
                      <div className="relative w-52">
                        <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                          placeholder="Enter unit price"
                          className={`pl-6 ${FIELD_HEIGHT}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2">
                      <span className="text-sm font-medium text-muted-foreground">Tiered Pricing:</span>
                      <Badge variant="destructive">Disabled</Badge>
                    </div>
                  </Section>
                ) : (
                  <Section title="Select Pricing Template">
                    <Field label="Choose Template">
                      <Select
                        items={pricingTemplates.map((t: any) => ({ value: t.id, label: t.name }))}
                        value={selectedTemplateId}
                        onValueChange={setSelectedTemplateId}
                        disabled={templatesLoading}
                      >
                        <SelectTrigger className={`w-full ${FIELD_HEIGHT}`}>
                          <SelectValue placeholder={templatesLoading ? "Loading…" : "Select a pricing template"} />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingTemplates.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} — ${t.pricingInfo?.unitPrice ?? 0}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!templatesLoading && pricingTemplates.length === 0 && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          No pricing templates available. Create one under Settings &gt; Pricing Templates.
                        </p>
                      )}
                    </Field>

                    {selectedTemplate && (
                      <div className="mt-4 flex flex-col gap-3">
                        <div>
                          <div className="text-sm font-semibold">{selectedTemplate.name}</div>
                          {selectedTemplate.description && (
                            <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg p-3 ring-1 ring-foreground/10">
                            <span className="block text-xs text-muted-foreground">Unit Price</span>
                            <span className="text-lg font-semibold">
                              ${selectedTemplate.pricingInfo?.unitPrice ?? 0}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              / {selectedTemplate.sellableUoMShortForm || "unit"}
                            </span>
                          </div>
                          <div className="rounded-lg p-3 ring-1 ring-foreground/10">
                            <span className="block text-xs text-muted-foreground">Tiered Pricing</span>
                            <span className="text-sm font-medium">
                              {selectedTemplate.pricingInfo?.isTieredPricingApplicable
                                ? `Enabled · ${selectedTemplate.pricingInfo?.tiers?.length ?? 0} tier(s)`
                                : "Disabled"}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {selectedTemplate.pricingInfo?.tieredPricingMeasurementType || ""}
                            </span>
                          </div>
                        </div>

                        {selectedTemplate.pricingInfo?.isTieredPricingApplicable &&
                          (selectedTemplate.pricingInfo?.tiers?.length ?? 0) > 0 && (
                            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                              {selectedTemplate.pricingInfo.tiers.map((tier: any, index: number) => {
                                const uom = uoms.find((u: any) => u.id === tier.displayUoMId);
                                return (
                                  <div
                                    key={index}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"
                                  >
                                    <span className="font-medium">
                                      Tier {index + 1} · Buy {tier.buyMinimum} {uom?.shortForm || "units"}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {tier.offType === "NEW_UNIT_PRICE" ? "New Price" : "Amount Off"}:{" "}
                                      <span className="font-semibold text-foreground">
                                        ${Number(tier.offAmount ?? 0).toFixed(2)}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    )}
                  </Section>
                )}

                <Section title="Conversion Settings">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={enableConversion}
                      onCheckedChange={(checked) => setEnableConversion(!!checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Enable Conversion
                      <span className="block text-xs text-muted-foreground">
                        Convert incoming transfer quantities into a different sellable unit.
                      </span>
                    </span>
                  </label>

                  {enableConversion && (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field label="Target Unit of Measure">
                        <Select
                          items={uoms.map((u: any) => ({
                            value: u.id,
                            label: u.shortForm ? `${u.name} (${u.shortForm})` : u.name,
                          }))}
                          value={projectedQtyUomId}
                          onValueChange={setProjectedQtyUomId}
                        >
                          <SelectTrigger className={`w-full ${FIELD_HEIGHT}`}>
                            <SelectValue placeholder="Select UoM" />
                          </SelectTrigger>
                          <SelectContent>
                            {uoms.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.shortForm ? `${u.name} (${u.shortForm})` : u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Conversion Rate">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={conversionRate}
                          onChange={(e) => setConversionRate(e.target.value)}
                          placeholder="Enter conversion rate"
                          className={FIELD_HEIGHT}
                        />
                      </Field>
                    </div>
                  )}
                </Section>

                <p className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground ring-1 ring-primary/20">
                  <span className="font-semibold text-foreground">Note:</span> These pricing and conversion settings
                  apply to all {selectedProducts.length} selected products.
                </p>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" className={ACTION_BUTTON} onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button className={ACTION_BUTTON} onClick={tab === "pricing" ? handlePricingSubmit : handleSubmit} disabled={saving}>
            {saving
              ? "Saving..."
              : tab === "pricing"
                ? `Update Pricing for ${selectedProducts.length} Product${selectedProducts.length === 1 ? "" : "s"}`
                : `Update ${selectedProducts.length} Product${selectedProducts.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
