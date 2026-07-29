"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { REGULAR_DEAL_DISCOUNT_TYPE_ITEMS, REGULAR_DEAL_TARGET_ENTITY_ITEMS } from "@/services/promotions/enums";
import { fetchCategoriesPage, fetchBrandsPage, fetchProductsPage, fetchPackagesPage } from "@/services/promotions/pickerAdapters";
import type { RegularDealInfoValue } from "./types";

export function RegularDealFields({
  value,
  onChange,
}: {
  value: RegularDealInfoValue;
  onChange: (patch: Partial<RegularDealInfoValue>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount Type">
          <Select items={REGULAR_DEAL_DISCOUNT_TYPE_ITEMS} value={value.discountType} onValueChange={(v) => onChange({ discountType: v as string })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGULAR_DEAL_DISCOUNT_TYPE_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Discount Rate" required>
          <Input type="number" min={0} value={value.discountRate} onChange={(e) => onChange({ discountRate: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Applies To">
        <Select items={REGULAR_DEAL_TARGET_ENTITY_ITEMS} value={value.targetEntity} onValueChange={(v) => onChange({ targetEntity: v as string })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGULAR_DEAL_TARGET_ENTITY_ITEMS.map((i) => (
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

      <Field label="Product Exceptions">
        <MultiApiSelect placeholder="Exclude specific products" fetchPage={fetchProductsPage} value={value.productExceptionIds} onChange={(ids) => onChange({ productExceptionIds: ids })} triggerClassName="w-full" />
      </Field>
      <Field label="Package Exceptions">
        <MultiApiSelect placeholder="Exclude specific packages" fetchPage={fetchPackagesPage} value={value.packageExceptionIds} onChange={(ids) => onChange({ packageExceptionIds: ids })} triggerClassName="w-full" />
      </Field>

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Per-Line-Item Price Cap</div>
          <div className="text-xs text-muted-foreground">Restrict the discount below a max price per line item</div>
        </div>
        <Switch checked={!!value.isPerLineItemPriceRestrictionEnabled} onCheckedChange={(c) => onChange({ isPerLineItemPriceRestrictionEnabled: !!c })} />
      </div>
      {value.isPerLineItemPriceRestrictionEnabled && (
        <Field label="Maximum Price Per Line Item">
          <Input
            type="number"
            min={0}
            value={value.perLineItemPriceRestrictionAmount}
            onChange={(e) => onChange({ perLineItemPriceRestrictionAmount: Number(e.target.value) })}
          />
        </Field>
      )}
    </div>
  );
}
