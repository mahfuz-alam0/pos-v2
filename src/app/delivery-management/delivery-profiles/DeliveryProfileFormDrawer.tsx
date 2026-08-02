"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, X, Plus, Trash2, Clock } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleDeliveryProfile } from "@/services/deliveryProfiles/getSingle";
import { upsertDeliveryProfile } from "@/services/deliveryProfiles/upsert";
import { fetchCategoriesList } from "@/services/categories/list";
import { fetchTagsList } from "@/services/tags/list";
import { fetchProductsList } from "@/services/products/list";
import { fetchCustomerGroups } from "@/services/customerGroups/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { Field } from "@/components/admin/form-fields";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  WEEKDAYS,
  EXCEPTION_TYPES,
  REGION_LABELS,
  makeDefaultValues,
  seedFromProfile,
  buildPayload,
  type FormValues,
  type ExceptionRule,
} from "./deliveryProfileForm";

interface DeliveryProfileFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  profile: { id: string } | null;
  availableRegions: string[];
  onClose: () => void;
  onSaved: () => void;
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-[7px] px-3 py-1 text-sm transition-colors",
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ number, title, subtitle, children, right }: { number: string; title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 ring-1 ring-foreground/10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {number}
          </div>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function MinOrderValueRow({
  checked,
  value,
  onCheckedChange,
  onValueChange,
}: {
  checked: boolean;
  value: number;
  onCheckedChange: (v: boolean) => void;
  onValueChange: (v: number) => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={checked} onCheckedChange={(c) => onCheckedChange(!!c)} />
        Minimum Order Value
      </label>
      {checked && (
        <Input
          type="number"
          min={0}
          step={0.01}
          value={value}
          onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
          onFocus={(e) => e.target.select()}
          className="w-36"
        />
      )}
    </div>
  );
}

function FreeDeliveryRow({
  checked,
  value,
  onCheckedChange,
  onValueChange,
}: {
  checked: boolean;
  value: number;
  onCheckedChange: (v: boolean) => void;
  onValueChange: (v: number) => void;
}) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={(c) => onCheckedChange(!!c)} size="sm" />
        <span className="text-sm font-semibold">Free Delivery Over</span>
      </div>
      <Input
        type="number"
        min={0}
        step={0.01}
        value={value}
        disabled={!checked}
        onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
        placeholder={checked ? "Enter minimum order amount" : "Enable to set amount"}
        className="w-full"
      />
    </div>
  );
}

export default function DeliveryProfileFormDrawer({ open, mode, profile, availableRegions, onClose, onSaved }: DeliveryProfileFormDrawerProps) {
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues>(makeDefaultValues());
  const [customerGroups, setCustomerGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!open) return;

    fetchCustomerGroups()
      .then((res) => setCustomerGroups((res?.data?.data?.customerGroups ?? res?.data?.customerGroups ?? []).map((g: any) => ({ id: g.id, name: g.name }))))
      .catch(() => {});

    if (mode === "add" || !profile?.id) {
      setValues(makeDefaultValues());
      return;
    }

    setLoading(true);
    fetchSingleDeliveryProfile(profile.id, shopId as string)
      .then((res) => setValues(seedFromProfile(res?.data)))
      .finally(() => setLoading(false));
  }, [open, mode, profile, shopId]);

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      const payload = buildPayload(values, profile?.id ?? null);
      await upsertDeliveryProfile({ ...payload, shopId });
      toast.success(profile?.id ? "Delivery profile updated." : "Delivery profile created.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const updateExceptionRule = (index: number, patch: Partial<ExceptionRule>) => {
    const next = [...values.exceptionRules];
    next[index] = { ...next[index], ...patch };
    set("exceptionRules", next);
  };

  const removeExceptionRule = (index: number) => {
    set("exceptionRules", values.exceptionRules.filter((_, i) => i !== index));
  };

  const updateDaySlots = (dayKey: string, patch: Partial<FormValues["deliverySlots"][string]>) => {
    set("deliverySlots", { ...values.deliverySlots, [dayKey]: { ...values.deliverySlots[dayKey], ...patch } });
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "New Delivery Profile" : "Edit Delivery Profile"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">Configure region, pricing, exceptions, and time slots</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Section 1: Delivery Region */}
              <Section
                number="1"
                title="Delivery Region"
                subtitle="Define which state and zip codes this option covers"
                right={
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Enabled</span>
                    <Switch checked={values.isEnabled} onCheckedChange={(c) => set("isEnabled", !!c)} />
                  </div>
                }
              >
                <Field label="Choose State" className="mb-3">
                  <Select
                    items={availableRegions.map((r) => ({ value: r, label: REGION_LABELS[r] ?? r }))}
                    value={values.state}
                    onValueChange={(v) => set("state", v as string)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableRegions.length ? availableRegions : ["CALIFORNIA", "MICHIGAN"]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {REGION_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Coverage Mode" className="mb-3">
                  <Select
                    items={[
                      { value: "ALL", label: "All Zip Codes" },
                      { value: "INCLUDE", label: "Include Zip Codes" },
                      { value: "EXCLUDE", label: "Exclude Zip Codes" },
                    ]}
                    value={values.zipMode}
                    onValueChange={(v) => set("zipMode", v as FormValues["zipMode"])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Zip Codes</SelectItem>
                      <SelectItem value="INCLUDE">Include Zip Codes</SelectItem>
                      <SelectItem value="EXCLUDE">Exclude Zip Codes</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {(values.zipMode === "INCLUDE" || values.zipMode === "EXCLUDE") && (
                  <Field label="Zip Code(s)">
                    <Input
                      placeholder="Type zip codes separated by commas"
                      value={values.zipCodes.join(", ")}
                      onChange={(e) =>
                        set(
                          "zipCodes",
                          e.target.value
                            .split(",")
                            .map((z) => z.trim())
                            .filter(Boolean)
                        )
                      }
                    />
                  </Field>
                )}
              </Section>

              {/* Section 2: Pricing Configuration */}
              <Section number="2" title="Pricing Configuration" subtitle="Choose a pricing model and set fees">
                <div className="mb-4">
                  <SegmentedToggle
                    value={values.pricingMode}
                    onChange={(v) => set("pricingMode", v)}
                    options={[
                      { value: "FLAT_RATE", label: "Flat Rate" },
                      { value: "DISTANCE_BASED", label: "Distance Based" },
                      { value: "ORDER_VALUE_BASED", label: "Order Value" },
                      { value: "FREE", label: "Free" },
                    ]}
                  />
                </div>

                {values.pricingMode === "FLAT_RATE" && (
                  <>
                    <div className="mb-3">
                      <SegmentedToggle
                        value={values.flatRate_deliveryChargeType}
                        onChange={(v) => set("flatRate_deliveryChargeType", v)}
                        options={[
                          { value: "PER_ORDER_BASIS", label: "Per Order Fee" },
                          { value: "PER_ITEM_BASIS", label: "Per Item Fee" },
                        ]}
                      />
                    </div>
                    <Field label="Delivery Charge" className="mb-3">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={values.flatRate_deliveryCharge}
                        onChange={(e) => set("flatRate_deliveryCharge", parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                      />
                    </Field>
                    <MinOrderValueRow
                      checked={values.flatRate_shouldCheckMinimumOrderValue}
                      value={values.flatRate_minimumOrderValue}
                      onCheckedChange={(v) => set("flatRate_shouldCheckMinimumOrderValue", v)}
                      onValueChange={(v) => set("flatRate_minimumOrderValue", v)}
                    />
                    <FreeDeliveryRow
                      checked={values.flatRate_shouldAllowFreeDelivery}
                      value={values.flatRate_freeDeliveryValue}
                      onCheckedChange={(v) => set("flatRate_shouldAllowFreeDelivery", v)}
                      onValueChange={(v) => set("flatRate_freeDeliveryValue", v)}
                    />
                  </>
                )}

                {values.pricingMode === "DISTANCE_BASED" && (
                  <>
                    <Field label="Base Charge" className="mb-3">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={values.distance_baseCharge}
                        onChange={(e) => set("distance_baseCharge", parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                      />
                    </Field>
                    <MinOrderValueRow
                      checked={values.distance_shouldCheckMinimumOrderValue}
                      value={values.distance_minimumOrderValue}
                      onCheckedChange={(v) => set("distance_shouldCheckMinimumOrderValue", v)}
                      onValueChange={(v) => set("distance_minimumOrderValue", v)}
                    />
                    <p className="mb-2 text-xs text-muted-foreground">Distance tiers — set fees per mile range.</p>
                    <div className="flex flex-col gap-1.5">
                      {values.distanceTiers.length > 0 && (
                        <div className="grid grid-cols-[1fr_16px_1fr_1fr_1fr_28px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>From (mi)</span>
                          <span />
                          <span>To (mi)</span>
                          <span>Add. Charge</span>
                          <span>Add. Time (min)</span>
                          <span />
                        </div>
                      )}
                      {values.distanceTiers.map((tier, i) => (
                        <div key={i} className="grid grid-cols-[1fr_16px_1fr_1fr_1fr_28px] items-center gap-2">
                          <Input type="number" value={tier.from} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.distanceTiers];
                            next[i] = { ...next[i], from: parseFloat(e.target.value) || 0 };
                            set("distanceTiers", next);
                          }} />
                          <span className="text-center text-xs text-muted-foreground">→</span>
                          <Input type="number" value={tier.to} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.distanceTiers];
                            next[i] = { ...next[i], to: parseFloat(e.target.value) || 0 };
                            set("distanceTiers", next);
                          }} />
                          <Input type="number" value={tier.additionalCharge} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.distanceTiers];
                            next[i] = { ...next[i], additionalCharge: parseFloat(e.target.value) || 0 };
                            set("distanceTiers", next);
                          }} />
                          <Input type="number" value={tier.additionalTime} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.distanceTiers];
                            next[i] = { ...next[i], additionalTime: parseFloat(e.target.value) || 0 };
                            set("distanceTiers", next);
                          }} />
                          <Button variant="ghost" size="icon-sm" onClick={() => set("distanceTiers", values.distanceTiers.filter((_, idx) => idx !== i))}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => set("distanceTiers", [...values.distanceTiers, { from: 0, to: 5, additionalCharge: 0, additionalTime: 0 }])}
                    >
                      <Plus className="size-4" /> Add Distance Tier
                    </Button>
                    <FreeDeliveryRow
                      checked={values.distance_shouldAllowFreeDelivery}
                      value={values.distance_freeDeliveryValue}
                      onCheckedChange={(v) => set("distance_shouldAllowFreeDelivery", v)}
                      onValueChange={(v) => set("distance_freeDeliveryValue", v)}
                    />
                  </>
                )}

                {values.pricingMode === "ORDER_VALUE_BASED" && (
                  <>
                    <Field label="Base Charge" className="mb-3">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={values.orderValue_baseCharge}
                        onChange={(e) => set("orderValue_baseCharge", parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                      />
                    </Field>
                    <MinOrderValueRow
                      checked={values.orderValue_shouldCheckMinimumOrderValue}
                      value={values.orderValue_minimumOrderValue}
                      onCheckedChange={(v) => set("orderValue_shouldCheckMinimumOrderValue", v)}
                      onValueChange={(v) => set("orderValue_minimumOrderValue", v)}
                    />
                    <p className="mb-2 text-xs text-muted-foreground">Order value tiers — set fees per order total range.</p>
                    <div className="flex flex-col gap-1.5">
                      {values.orderValueTiers.length > 0 && (
                        <div className="grid grid-cols-[1fr_16px_1fr_1fr_28px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>From ($)</span>
                          <span />
                          <span>To ($)</span>
                          <span>Add. Charge</span>
                          <span />
                        </div>
                      )}
                      {values.orderValueTiers.map((tier, i) => (
                        <div key={i} className="grid grid-cols-[1fr_16px_1fr_1fr_28px] items-center gap-2">
                          <Input type="number" value={tier.from} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.orderValueTiers];
                            next[i] = { ...next[i], from: parseFloat(e.target.value) || 0 };
                            set("orderValueTiers", next);
                          }} />
                          <span className="text-center text-xs text-muted-foreground">→</span>
                          <Input type="number" value={tier.to} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.orderValueTiers];
                            next[i] = { ...next[i], to: parseFloat(e.target.value) || 0 };
                            set("orderValueTiers", next);
                          }} />
                          <Input type="number" value={tier.additionalCharge} onFocus={(e) => e.target.select()} onChange={(e) => {
                            const next = [...values.orderValueTiers];
                            next[i] = { ...next[i], additionalCharge: parseFloat(e.target.value) || 0 };
                            set("orderValueTiers", next);
                          }} />
                          <Button variant="ghost" size="icon-sm" onClick={() => set("orderValueTiers", values.orderValueTiers.filter((_, idx) => idx !== i))}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => set("orderValueTiers", [...values.orderValueTiers, { from: 0, to: 50, additionalCharge: 0 }])}
                    >
                      <Plus className="size-4" /> Add Order Value Tier
                    </Button>
                    <FreeDeliveryRow
                      checked={values.orderValue_shouldAllowFreeDelivery}
                      value={values.orderValue_freeDeliveryValue}
                      onCheckedChange={(v) => set("orderValue_shouldAllowFreeDelivery", v)}
                      onValueChange={(v) => set("orderValue_freeDeliveryValue", v)}
                    />
                  </>
                )}

                {values.pricingMode === "FREE" && (
                  <>
                    <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950">
                      <span className="text-sm text-green-700 dark:text-green-400">Delivery is free for all qualifying orders.</span>
                    </div>
                    <MinOrderValueRow
                      checked={values.free_shouldCheckMinimumOrderValue}
                      value={values.free_minimumOrderValue}
                      onCheckedChange={(v) => set("free_shouldCheckMinimumOrderValue", v)}
                      onValueChange={(v) => set("free_minimumOrderValue", v)}
                    />
                  </>
                )}
              </Section>

              {/* Section 3: Exception Rules */}
              <Section number="3" title="Exception Rules" subtitle="Restrict or override for specific categories, tags, products, or customer groups">
                <div className="flex flex-col gap-2">
                  {values.exceptionRules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
                      <Select
                        items={EXCEPTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                        value={rule.type ?? undefined}
                        onValueChange={(v) => updateExceptionRule(i, { type: v as string, ids: [] })}
                      >
                        <SelectTrigger className="w-40 shrink-0">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXCEPTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="min-w-0 flex-1">
                        {!rule.type ? (
                          <div className="flex h-8 items-center px-2 text-xs italic text-muted-foreground">Select a type first</div>
                        ) : rule.type === "CUSTOMER_GROUP" ? (
                          <MultiApiSelect
                            placeholder="Select customer groups"
                            value={rule.ids}
                            onChange={(ids) => updateExceptionRule(i, { ids })}
                            items={customerGroups}
                            triggerClassName="w-full"
                          />
                        ) : rule.type === "CATEGORY" ? (
                          <MultiApiSelect
                            placeholder="Search categories..."
                            value={rule.ids}
                            onChange={(ids) => updateExceptionRule(i, { ids })}
                            fetchPage={async (page, search) => {
                              const res = await fetchCategoriesList({ page, limit: 20, name: search });
                              return { items: (res?.data ?? []).map((c: any) => ({ id: String(c.id), name: c.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                            }}
                            triggerClassName="w-full"
                          />
                        ) : rule.type === "TAG" ? (
                          <MultiApiSelect
                            placeholder="Search tags..."
                            value={rule.ids}
                            onChange={(ids) => updateExceptionRule(i, { ids })}
                            fetchPage={async (page, search) => {
                              const res = await fetchTagsList({ page, limit: 20, name: search });
                              return { items: (res?.data ?? []).map((t: any) => ({ id: String(t.id), name: t.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                            }}
                            triggerClassName="w-full"
                          />
                        ) : (
                          <MultiApiSelect
                            placeholder="Search products..."
                            value={rule.ids}
                            onChange={(ids) => updateExceptionRule(i, { ids })}
                            fetchPage={async (page, search) => {
                              const res = await fetchProductsList({ page, limit: 20, name: search });
                              return { items: (res?.data ?? []).map((p: any) => ({ id: String(p.id), name: p.name })), totalPages: res?.paginationData?.totalPages ?? 1 };
                            }}
                            triggerClassName="w-full"
                          />
                        )}
                      </div>

                      <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => removeExceptionRule(i)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => set("exceptionRules", [...values.exceptionRules, { type: null, ids: [] }])}
                >
                  <Plus className="size-4" /> Add Exception Rule
                </Button>
              </Section>

              {/* Section 4: Priority Fees */}
              <Section
                number="4"
                title="Priority Fees"
                subtitle="Offer speed tiers customers can choose at checkout"
                right={<Switch checked={values.speedTiersEnabled} onCheckedChange={(c) => set("speedTiersEnabled", !!c)} />}
              >
                {values.speedTiersEnabled && (
                  <>
                    <div className="flex flex-col gap-2">
                      {values.speedTiers.length > 0 && (
                        <div className="grid grid-cols-[1fr_1.5fr_1fr_28px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <span>Name</span>
                          <span>Description</span>
                          <span>Additional Charge</span>
                          <span />
                        </div>
                      )}
                      {values.speedTiers.map((tier, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_28px] items-center gap-2">
                          <Input
                            placeholder="e.g. Express"
                            value={tier.name}
                            onChange={(e) => {
                              const next = [...values.speedTiers];
                              next[i] = { ...next[i], name: e.target.value };
                              set("speedTiers", next);
                            }}
                          />
                          <Input
                            placeholder="e.g. Get delivery in under 2 hrs"
                            value={tier.description}
                            onChange={(e) => {
                              const next = [...values.speedTiers];
                              next[i] = { ...next[i], description: e.target.value };
                              set("speedTiers", next);
                            }}
                          />
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={tier.fee}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const next = [...values.speedTiers];
                              next[i] = { ...next[i], fee: parseFloat(e.target.value) || 0 };
                              set("speedTiers", next);
                            }}
                          />
                          <Button variant="ghost" size="icon-sm" onClick={() => set("speedTiers", values.speedTiers.filter((_, idx) => idx !== i))}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => set("speedTiers", [...values.speedTiers, { name: "", description: "", fee: 0 }])}
                    >
                      <Plus className="size-4" /> Add Tier
                    </Button>
                  </>
                )}

                <label className="mt-3 flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.shouldAllowUserToPickDeliverySlots}
                    onCheckedChange={(c) => set("shouldAllowUserToPickDeliverySlots", !!c)}
                  />
                  Allow customer to schedule the delivery
                </label>
              </Section>

              {/* Section 5: Delivery Slots */}
              <Section number="5" title="Delivery Slots" subtitle="Set available delivery windows per day of the week">
                <div className="flex flex-col gap-2">
                  {WEEKDAYS.map(({ key, label }) => {
                    const day = values.deliverySlots[key];
                    return (
                      <div
                        key={key}
                        className={cn(
                          "overflow-hidden rounded-lg ring-1 transition-colors",
                          day.enabled ? "ring-primary/30" : "ring-foreground/10"
                        )}
                      >
                        <div className={cn("flex items-center justify-between px-3 py-2", day.enabled ? "bg-primary/5" : "bg-muted/40")}>
                          <div className="flex items-center gap-2.5">
                            <Switch checked={day.enabled} onCheckedChange={(c) => updateDaySlots(key, { enabled: !!c })} size="sm" />
                            <span className={cn("text-sm font-medium", day.enabled ? "" : "text-muted-foreground")}>{label}</span>
                          </div>
                          {day.enabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => updateDaySlots(key, { slots: [...day.slots, { from: null, to: null }] })}
                            >
                              Add Slot
                            </Button>
                          )}
                        </div>
                        {day.enabled && (
                          <div className="px-3 py-2">
                            {day.slots.length === 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => updateDaySlots(key, { slots: [{ from: null, to: null }] })}
                              >
                                Add Time Slot
                              </Button>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {day.slots.map((slot, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <Clock className="size-3.5 shrink-0 text-primary/70" />
                                    <Input
                                      type="time"
                                      value={slot.from ?? ""}
                                      onChange={(e) => {
                                        const nextSlots = [...day.slots];
                                        nextSlots[i] = { ...nextSlots[i], from: e.target.value };
                                        updateDaySlots(key, { slots: nextSlots });
                                      }}
                                      className="flex-1"
                                    />
                                    <span className="text-xs text-muted-foreground">–</span>
                                    <Input
                                      type="time"
                                      value={slot.to ?? ""}
                                      onChange={(e) => {
                                        const nextSlots = [...day.slots];
                                        nextSlots[i] = { ...nextSlots[i], to: e.target.value };
                                        updateDaySlots(key, { slots: nextSlots });
                                      }}
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => updateDaySlots(key, { slots: day.slots.filter((_, idx) => idx !== i) })}
                                    >
                                      <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* Section 6: Estimation Window */}
              <Section number="6" title="Delivery Estimation Window" subtitle="Approximate delivery time shown to the customer">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-sm">From</span>
                  <Input
                    type="number"
                    min={1}
                    value={values.estimationFromTime}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => set("estimationFromTime", parseInt(e.target.value, 10) || 1)}
                    className="w-20"
                  />
                  <span className="shrink-0 text-sm">to</span>
                  <Input
                    type="number"
                    min={1}
                    value={values.estimationToTime}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => set("estimationToTime", parseInt(e.target.value, 10) || 1)}
                    className="w-20"
                  />
                  <Select
                    items={[
                      { value: "HOURS", label: "Hours" },
                      { value: "MINS", label: "Minutes" },
                      { value: "DAYS", label: "Days" },
                    ]}
                    value={values.estimationWindowType}
                    onValueChange={(v) => set("estimationWindowType", v as FormValues["estimationWindowType"])}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOURS">Hours</SelectItem>
                      <SelectItem value="MINS">Minutes</SelectItem>
                      <SelectItem value="DAYS">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : `${mode === "add" ? "Create" : "Update"} Delivery Profile`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
