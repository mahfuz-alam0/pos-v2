"use client";

import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import {
  TIERED_MEASUREMENT_TYPE_ITEMS,
  TIERED_DEAL_TARGET_ENTITY_ITEMS,
  TIERED_OFF_TYPE_ITEMS,
} from "@/services/promotions/enums";
import { fetchCategoriesPage, fetchBrandsPage, fetchProductsPage, fetchTagsPage, fetchPackagesPage } from "@/services/promotions/pickerAdapters";
import type { TieredDealInfoValue } from "./types";

export function TieredDealFields({
  value,
  onChange,
}: {
  value: TieredDealInfoValue;
  onChange: (patch: Partial<TieredDealInfoValue>) => void;
}) {
  const updateTier = (index: number, patch: Partial<TieredDealInfoValue["tiers"][number]>) => {
    onChange({ tiers: value.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  };

  const addTier = () => {
    onChange({ tiers: [...value.tiers, { buyMinimum: 1, offAmount: 10, offType: "UNIT_PERCENTAGE_OFF" }] });
  };

  const removeTier = (index: number) => {
    onChange({ tiers: value.tiers.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-4">
      <Field label="Measurement Type">
        <Select items={TIERED_MEASUREMENT_TYPE_ITEMS} value={value.measurementType} onValueChange={(v) => onChange({ measurementType: v as string })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIERED_MEASUREMENT_TYPE_ITEMS.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Tiers" required>
        <div className="flex flex-col gap-2">
          {value.tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg p-2.5 ring-1 ring-foreground/10">
              <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              <Input
                type="number"
                min={0}
                placeholder="Buy min."
                className="h-8"
                value={tier.buyMinimum}
                onChange={(e) => updateTier(i, { buyMinimum: Number(e.target.value) })}
              />
              <Input
                type="number"
                min={0}
                placeholder="Off amount"
                className="h-8"
                value={tier.offAmount}
                onChange={(e) => updateTier(i, { offAmount: Number(e.target.value) })}
              />
              <Select items={TIERED_OFF_TYPE_ITEMS} value={tier.offType} onValueChange={(v) => updateTier(i, { offType: v as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIERED_OFF_TYPE_ITEMS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => removeTier(i)} disabled={value.tiers.length <= 1}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addTier} className="self-start">
            <Plus className="size-3.5" /> Add Tier
          </Button>
        </div>
      </Field>

      <Field label="Applies To">
        <Select items={TIERED_DEAL_TARGET_ENTITY_ITEMS} value={value.targetEntity} onValueChange={(v) => onChange({ targetEntity: v as string })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIERED_DEAL_TARGET_ENTITY_ITEMS.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {value.targetEntity === "CATEGORIES" && (
        <Field label="Categories" required>
          <MultiApiSelect placeholder="Select categories" fetchPage={fetchCategoriesPage} value={value.associatedCategoryIds} onChange={(ids) => onChange({ associatedCategoryIds: ids })} triggerClassName="w-full" />
        </Field>
      )}
      {value.targetEntity === "BRANDS" && (
        <Field label="Brands" required>
          <MultiApiSelect placeholder="Select brands" fetchPage={fetchBrandsPage} value={value.associatedBrandIds} onChange={(ids) => onChange({ associatedBrandIds: ids })} triggerClassName="w-full" />
        </Field>
      )}
      {value.targetEntity === "PRODUCTS" && (
        <Field label="Products" required>
          <MultiApiSelect placeholder="Select products" fetchPage={fetchProductsPage} value={value.associatedProductIds} onChange={(ids) => onChange({ associatedProductIds: ids })} triggerClassName="w-full" />
        </Field>
      )}
      {value.targetEntity === "TAGS" && (
        <Field label="Tags" required>
          <MultiApiSelect placeholder="Select tags" fetchPage={fetchTagsPage} value={value.associatedTagIds} onChange={(ids) => onChange({ associatedTagIds: ids })} triggerClassName="w-full" />
        </Field>
      )}

      <Field label="Product Exceptions">
        <MultiApiSelect placeholder="Exclude products" fetchPage={fetchProductsPage} value={value.productExceptionIds} onChange={(ids) => onChange({ productExceptionIds: ids })} triggerClassName="w-full" />
      </Field>
      <Field label="Package Exceptions">
        <MultiApiSelect placeholder="Exclude packages" fetchPage={fetchPackagesPage} value={value.packageExceptionIds} onChange={(ids) => onChange({ packageExceptionIds: ids })} triggerClassName="w-full" />
      </Field>

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="text-sm font-medium">Auto-Apply Best Tier</div>
        <Switch checked={value.shouldAllowAutoApply} onCheckedChange={(c) => onChange({ shouldAllowAutoApply: !!c })} />
      </div>
      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="text-sm font-medium">Allow Mix &amp; Match</div>
        <Switch checked={value.shouldAllowMixAndMatch} onCheckedChange={(c) => onChange({ shouldAllowMixAndMatch: !!c })} />
      </div>
    </div>
  );
}
