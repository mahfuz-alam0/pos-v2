"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";
import { MultiApiSelect, type MultiApiSelectOption } from "@/components/ui/multi-api-select";
import {
  BOGO_BUY_SCOPE_ITEMS,
  BOGO_GET_PRODUCT_TYPE_ITEMS,
  BOGO_DISCOUNT_TYPE_ITEMS,
  BOGO_DISCOUNT_TARGET_ITEMS,
} from "@/services/promotions/enums";
import { fetchCategoriesPage, fetchBrandsPage, fetchProductsPage, fetchPackagesPage } from "@/services/promotions/pickerAdapters";
import type { BogoDealInfoValue } from "./types";

function EntityPicker({
  scope,
  categoryIds,
  brandIds,
  productIds,
  categoryLabels,
  brandLabels,
  productLabels,
  onChange,
}: {
  scope: string;
  categoryIds: string[];
  brandIds: string[];
  productIds: string[];
  categoryLabels?: MultiApiSelectOption[];
  brandLabels?: MultiApiSelectOption[];
  productLabels?: MultiApiSelectOption[];
  onChange: (patch: { categoryIds?: string[]; brandIds?: string[]; productIds?: string[] }) => void;
}) {
  if (scope === "CATEGORIES")
    return <MultiApiSelect placeholder="Select categories" fetchPage={fetchCategoriesPage} value={categoryIds} onChange={(ids) => onChange({ categoryIds: ids })} initialLabels={categoryLabels} triggerClassName="w-full" />;
  if (scope === "BRANDS")
    return <MultiApiSelect placeholder="Select brands" fetchPage={fetchBrandsPage} value={brandIds} onChange={(ids) => onChange({ brandIds: ids })} initialLabels={brandLabels} triggerClassName="w-full" />;
  return <MultiApiSelect placeholder="Select products" fetchPage={fetchProductsPage} value={productIds} onChange={(ids) => onChange({ productIds: ids })} initialLabels={productLabels} triggerClassName="w-full" />;
}

export function BogoDealFields({
  value,
  onChange,
  labels,
}: {
  value: BogoDealInfoValue;
  onChange: (patch: Partial<BogoDealInfoValue>) => void;
  labels?: Partial<Record<keyof BogoDealInfoValue, MultiApiSelectOption[]>>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="mb-3 text-sm font-semibold">Buy</div>
        <div className="flex flex-col gap-3">
          <Field label="Buy Minimum Quantity" required>
            <Input type="number" min={1} value={value.buyMinimumExactQuantity} onChange={(e) => onChange({ buyMinimumExactQuantity: Number(e.target.value) })} />
          </Field>
          <Field label="Buy Product Scope">
            <Select items={BOGO_BUY_SCOPE_ITEMS} value={value.buyProductScope} onValueChange={(v) => onChange({ buyProductScope: v as string })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOGO_BUY_SCOPE_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Buy Products/Categories/Brands" required>
            <EntityPicker
              scope={value.buyProductScope}
              categoryIds={value.buyProductCategoryIds}
              brandIds={value.buyProductBrandIds}
              productIds={value.buyProductIds}
              categoryLabels={labels?.buyProductCategoryIds}
              brandLabels={labels?.buyProductBrandIds}
              productLabels={labels?.buyProductIds}
              onChange={(patch) =>
                onChange({
                  ...(patch.categoryIds ? { buyProductCategoryIds: patch.categoryIds } : {}),
                  ...(patch.brandIds ? { buyProductBrandIds: patch.brandIds } : {}),
                  ...(patch.productIds ? { buyProductIds: patch.productIds } : {}),
                })
              }
            />
          </Field>
          <Field label="Buy Product Exceptions">
            <MultiApiSelect placeholder="Exclude products" fetchPage={fetchProductsPage} value={value.buyProductExceptionIds} onChange={(ids) => onChange({ buyProductExceptionIds: ids })} initialLabels={labels?.buyProductExceptionIds} triggerClassName="w-full" />
          </Field>
          <Field label="Buy Package Exceptions">
            <MultiApiSelect placeholder="Exclude packages" fetchPage={fetchPackagesPage} value={value.buyProductPackageExceptionIds} onChange={(ids) => onChange({ buyProductPackageExceptionIds: ids })} initialLabels={labels?.buyProductPackageExceptionIds} triggerClassName="w-full" />
          </Field>
        </div>
      </div>

      <div className="rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="mb-3 text-sm font-semibold">Get</div>
        <div className="flex flex-col gap-3">
          <Field label="Get Quantity" required>
            <Input type="number" min={1} value={value.getProductQuantity} onChange={(e) => onChange({ getProductQuantity: Number(e.target.value) })} />
          </Field>
          <Field label="Get Product Type">
            <Select items={BOGO_GET_PRODUCT_TYPE_ITEMS} value={value.getProductType} onValueChange={(v) => onChange({ getProductType: v as string })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOGO_GET_PRODUCT_TYPE_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {value.getProductType === "OTHER_DEFINED" && (
            <>
              <Field label="Get Product Scope">
                <Select items={BOGO_BUY_SCOPE_ITEMS} value={value.userPickedProductScopes} onValueChange={(v) => onChange({ userPickedProductScopes: v as string })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOGO_BUY_SCOPE_ITEMS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Get Products/Categories/Brands" required>
                <EntityPicker
                  scope={value.userPickedProductScopes}
                  categoryIds={value.getProductCategoryIds}
                  brandIds={value.getProductBrandIds}
                  productIds={value.getProductIds}
                  categoryLabels={labels?.getProductCategoryIds}
                  brandLabels={labels?.getProductBrandIds}
                  productLabels={labels?.getProductIds}
                  onChange={(patch) =>
                    onChange({
                      ...(patch.categoryIds ? { getProductCategoryIds: patch.categoryIds } : {}),
                      ...(patch.brandIds ? { getProductBrandIds: patch.brandIds } : {}),
                      ...(patch.productIds ? { getProductIds: patch.productIds } : {}),
                    })
                  }
                />
              </Field>
            </>
          )}

          <Field label="Get Product Exceptions">
            <MultiApiSelect placeholder="Exclude products" fetchPage={fetchProductsPage} value={value.getProductExceptionIds} onChange={(ids) => onChange({ getProductExceptionIds: ids })} initialLabels={labels?.getProductExceptionIds} triggerClassName="w-full" />
          </Field>
          <Field label="Get Package Exceptions">
            <MultiApiSelect placeholder="Exclude packages" fetchPage={fetchPackagesPage} value={value.getProductPackageExceptionIds} onChange={(ids) => onChange({ getProductPackageExceptionIds: ids })} initialLabels={labels?.getProductPackageExceptionIds} triggerClassName="w-full" />
          </Field>

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Cap Get-Product Amount</div>
            <Switch checked={!!value.isGetProductAmountCapApplicable} onCheckedChange={(c) => onChange({ isGetProductAmountCapApplicable: !!c })} />
          </div>
          {value.isGetProductAmountCapApplicable && (
            <Field label="Amount Cap">
              <Input type="number" min={0} value={value.getProductAmountCap} onChange={(e) => onChange({ getProductAmountCap: Number(e.target.value) })} />
            </Field>
          )}
        </div>
      </div>

      <div className="rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="mb-3 text-sm font-semibold">Discount</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount Type">
            <Select items={BOGO_DISCOUNT_TYPE_ITEMS} value={value.discountType} onValueChange={(v) => onChange({ discountType: v as string })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOGO_DISCOUNT_TYPE_ITEMS.map((i) => (
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
        <Field label="Apply Discount To" className="mt-3">
          <Select items={BOGO_DISCOUNT_TARGET_ITEMS} value={value.discountTargetType} onValueChange={(v) => onChange({ discountTargetType: v as string })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOGO_DISCOUNT_TARGET_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}
