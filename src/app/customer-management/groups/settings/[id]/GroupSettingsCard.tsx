"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { fetchCategoriesList } from "@/services/categories/list";

import type { RuleProfile } from "./types";

interface MetrcPurchaseType {
  productCategoryTypeStringId: string;
  productCategoryType: string;
}

interface UomOption {
  id: string;
  name: string;
}

async function fetchCategoryPage(page: number, search: string) {
  const res = await fetchCategoriesList({ page, limit: 20, search: search || undefined });
  return {
    items: (res?.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
    totalPages: res?.paginationData?.totalPages ?? 1,
  };
}

const SEGMENT_BASE = "rounded-[7px] px-3 py-1.5 text-sm font-medium transition-colors";
const SEGMENT_ACTIVE = "bg-primary text-primary-foreground";
const SEGMENT_INACTIVE = "text-muted-foreground hover:bg-background/60";

export default function GroupSettingsCard({
  profile,
  onChange,
  onRemove,
  purchaseTypes,
  uoms,
  onMeasurementTypeChange,
}: {
  profile: RuleProfile;
  onChange: (next: RuleProfile) => void;
  onRemove: () => void;
  purchaseTypes: MetrcPurchaseType[];
  uoms: UomOption[];
  onMeasurementTypeChange: (type: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: profile.clientId,
  });

  const isMetrc = profile.profileType === "METRC_BASED";

  const updateLimit = (index: number, patch: Partial<RuleProfile["maximumPurchaseLimitsBasedOnCategory"][number]>) => {
    const limits = profile.maximumPurchaseLimitsBasedOnCategory.slice();
    limits[index] = { ...limits[index], ...patch };
    onChange({ ...profile, maximumPurchaseLimitsBasedOnCategory: limits });
  };

  const addLimit = () => {
    onChange({
      ...profile,
      maximumPurchaseLimitsBasedOnCategory: [
        ...profile.maximumPurchaseLimitsBasedOnCategory,
        {
          measurementType: "TOTAL_QUANTITIES",
          categoryIds: [],
          name: null,
          colorCode: "#000000",
          uomId: "",
          limit: 0,
          ...(isMetrc ? { metrcPurchaseTypeIds: [] } : {}),
        },
      ],
    });
  };

  const removeLimit = (index: number) => {
    onChange({
      ...profile,
      maximumPurchaseLimitsBasedOnCategory: profile.maximumPurchaseLimitsBasedOnCategory.filter((_, i) => i !== index),
    });
  };

  const handleMetrcTypeChange = (index: number, value: string) => {
    const type = purchaseTypes.find((t) => t.productCategoryTypeStringId === value);
    updateLimit(index, { metrcPurchaseTypeIds: [value], name: type?.productCategoryType || "" });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="mb-4 overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10"
    >
      <div className="flex items-center justify-between bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
          <h4 className="text-sm font-semibold">{isMetrc ? "METRC Based Profile" : "Category Based Profile"}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${profile.isEnabled ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
          >
            {profile.isEnabled ? "Active" : "Inactive"}
          </span>
        </div>
        <Button variant="outline" size="icon-sm" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>

      <div className="px-4 py-4">
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Enforce Limits</label>
            <div className="flex w-fit rounded-lg bg-muted p-0.5">
              <button
                type="button"
                className={`${SEGMENT_BASE} ${profile.timeFrameToConsider.type === "PER_ORDER" ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                onClick={() =>
                  onChange({ ...profile, timeFrameToConsider: { type: "PER_ORDER", duration: 0 } })
                }
              >
                Per Order
              </button>
              <button
                type="button"
                className={`${SEGMENT_BASE} ${profile.timeFrameToConsider.type === "WITHIN_TIME_LIMIT_IN_DAYS" ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`}
                onClick={() =>
                  onChange({
                    ...profile,
                    timeFrameToConsider: { type: "WITHIN_TIME_LIMIT_IN_DAYS", duration: profile.timeFrameToConsider.duration || 1 },
                  })
                }
              >
                Within Last Days
              </button>
            </div>
            {profile.timeFrameToConsider.type === "WITHIN_TIME_LIMIT_IN_DAYS" && (
              <Select
                value={String(profile.timeFrameToConsider.duration || 1)}
                onValueChange={(val) =>
                  onChange({ ...profile, timeFrameToConsider: { type: "WITHIN_TIME_LIMIT_IN_DAYS", duration: Number(val) } })
                }
                items={Array.from({ length: 7 }).map((_, i) => ({ value: String(i + 1), label: `${i + 1} days` }))}
              >
                <SelectTrigger className="mt-2 w-28">
                  <SelectValue placeholder="Days" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Order Consideration Strategy</label>
            <Select
              value={profile.orderConsiderationStrategy}
              onValueChange={(val) => onChange({ ...profile, orderConsiderationStrategy: val as RuleProfile["orderConsiderationStrategy"] })}
              items={[
                { value: "WITHIN_SHOP", label: "Within Shop" },
                { value: "WITHIN_ORGANIZATION", label: "Within Organization" },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WITHIN_SHOP">Within Shop</SelectItem>
                <SelectItem value="WITHIN_ORGANIZATION">Within Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4 flex justify-end border-b pb-3">
          <Button size="sm" onClick={addLimit}>
            {isMetrc ? "+ Add Limit" : "+ Add Category Limit"}
          </Button>
        </div>

        {profile.maximumPurchaseLimitsBasedOnCategory.map((limit, limitIndex) => (
          <div key={limitIndex} className="mb-3 rounded-md bg-muted/40 p-4">
            <div className="grid grid-cols-12 gap-3">
              {!isMetrc && (
                <div className="col-span-3">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Rule Name</label>
                  <Input
                    className="h-8"
                    placeholder="Enter rule name"
                    value={limit.name ?? ""}
                    onChange={(e) => updateLimit(limitIndex, { name: e.target.value })}
                  />
                </div>
              )}

              <div className={isMetrc ? "col-span-3" : "col-span-3"}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {isMetrc ? "Purchase Type" : "Categories"}
                </label>
                {isMetrc ? (
                  <Select
                    value={limit.metrcPurchaseTypeIds?.[0] ?? ""}
                    onValueChange={(val) => handleMetrcTypeChange(limitIndex, val)}
                    items={purchaseTypes.map((t) => ({ value: t.productCategoryTypeStringId, label: t.productCategoryType }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Purchase Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseTypes.map((t) => (
                        <SelectItem key={t.productCategoryTypeStringId} value={t.productCategoryTypeStringId}>
                          {t.productCategoryType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <MultiApiSelect
                    placeholder="Select categories"
                    value={limit.categoryIds}
                    onChange={(ids) => updateLimit(limitIndex, { categoryIds: ids })}
                    fetchPage={fetchCategoryPage}
                    triggerClassName="w-full"
                  />
                )}
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Measurement Type</label>
                <Select
                  value={limit.measurementType}
                  onValueChange={(val) => {
                    updateLimit(limitIndex, { measurementType: val as RuleProfile["maximumPurchaseLimitsBasedOnCategory"][number]["measurementType"] });
                    onMeasurementTypeChange(val);
                  }}
                  items={[
                    { value: "TOTAL_QUANTITIES", label: "Total Quantity" },
                    { value: "WEIGHT_OF_TOTAL_QUANTITIES", label: "Total Weight" },
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOTAL_QUANTITIES">Total Quantity</SelectItem>
                    <SelectItem value="WEIGHT_OF_TOTAL_QUANTITIES">Total Weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Limit &amp; Unit</label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    className="h-8"
                    placeholder="Limit"
                    value={limit.limit}
                    onChange={(e) => updateLimit(limitIndex, { limit: Number(e.target.value) })}
                  />
                  <Select
                    value={limit.uomId}
                    onValueChange={(val) => updateLimit(limitIndex, { uomId: val })}
                    items={uoms.map((u) => ({ value: u.id, label: u.name }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="col-span-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Color</label>
                <input
                  type="color"
                  value={limit.colorCode}
                  onChange={(e) => updateLimit(limitIndex, { colorCode: e.target.value })}
                  className="size-8 cursor-pointer rounded border border-input bg-transparent p-0"
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeLimit(limitIndex)}>
                {isMetrc ? "Remove Limit" : "Remove Category Limit"}
              </Button>
            </div>
          </div>
        ))}

        <div className="mt-4 flex items-center justify-end gap-3 border-t pt-4">
          <label className="text-sm font-medium">Profile Status:</label>
          <Switch checked={profile.isEnabled} onCheckedChange={(checked) => onChange({ ...profile, isEnabled: !!checked })} />
        </div>
      </div>
    </div>
  );
}
