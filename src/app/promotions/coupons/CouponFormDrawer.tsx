"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";
import { RestrictionsFields, EMPTY_RESTRICTIONS, type RestrictionsValue } from "@/components/promotions/RestrictionsFields";
import { UsageRuleFields, EMPTY_USAGE_RULE, type UsageRuleValue } from "@/components/promotions/UsageRuleFields";
import { ValidityScheduler, type ShopExpiry } from "@/components/promotions/ValidityScheduler";
import { sanitizeShopExpiry } from "@/services/promotions/defaultShopExpiry";
import { COUPON_DISCOUNT_TYPE_ITEMS, COUPON_STACK_ITEMS } from "@/services/promotions/enums";
import { fetchSingleCoupon } from "@/services/coupons/getSingle";
import { createCoupon } from "@/services/coupons/create";
import { updateCouponInfoAndRules } from "@/services/coupons/updateInfoAndRules";
import { updateCouponExpiry } from "@/services/coupons/updateExpiry";
import { fetchScopedShopIdsForCoupons } from "@/services/coupons/scopedShops";

interface DetailsValue {
  name: string;
  couponCode: string;
  description: string;
  imageUrl: string | null;
  discountType: string;
  discountRate: number;
}

const EMPTY_DETAILS: DetailsValue = {
  name: "",
  couponCode: "",
  description: "",
  imageUrl: null,
  discountType: "PERCENTAGE",
  discountRate: 10,
};

const TAB_ORDER = ["general", "validity"] as const;

export default function CouponFormDrawer({
  open,
  mode,
  couponId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "add" | "edit";
  couponId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [details, setDetails] = useState<DetailsValue>(EMPTY_DETAILS);
  const [restrictions, setRestrictions] = useState<RestrictionsValue>(EMPTY_RESTRICTIONS);
  const [usageRule, setUsageRule] = useState<UsageRuleValue>(EMPTY_USAGE_RULE);
  const [shopExpiry, setShopExpiry] = useState<ShopExpiry[]>([]);

  useEffect(() => {
    if (!open) return;
    setTab("general");

    if (mode === "add") {
      setDetails(EMPTY_DETAILS);
      setRestrictions(EMPTY_RESTRICTIONS);
      setUsageRule(EMPTY_USAGE_RULE);
      setShopExpiry([]);
      return;
    }

    if (mode === "edit" && couponId) {
      setLoading(true);
      fetchSingleCoupon(couponId)
        .then((res) => {
          const c = res?.data;
          if (!c) {
            toast.error("Coupon not found");
            return;
          }
          setDetails({
            name: c.name ?? "",
            couponCode: c.couponCode ?? "",
            description: c.description ?? "",
            imageUrl: c.imageUrl ?? null,
            discountType: c.discountType ?? "PERCENTAGE",
            discountRate: c.discountRate ?? 0,
          });
          setRestrictions({
            shouldConsiderCustomerTypes: !!c.shouldConsiderCustomerTypes,
            allowedCustomerTypeIds: c.allowedCustomerTypeIds ?? [],
            shouldConsiderCustomerGroups: !!c.shouldConsiderCustomerGroups,
            allowedCustomerGroupIds: c.allowedCustomerGroupIds ?? [],
            allowAllSaleSources: c.allowAllSaleSources ?? true,
            allowedSaleSources: c.allowedSaleSources ?? [],
            allowAllDeliveryMethods: c.allowAllDeliveryMethods ?? true,
            allowedDeliveryMethods: c.allowedDeliveryMethods ?? [],
            allowedStacks: c.allowedStacks ?? [],
            shouldTargetSetOfCustomers: !!c.shouldTargetSetOfCustomers,
            targetedCustomerIds: (c.targetedCustomers ?? []).map((t: any) => t.id),
          });
          setUsageRule({
            isApplicable: !!c.usageRule?.isApplicable,
            minimumOrderAmount: c.usageRule?.minimumOrderAmount ?? { isEnabled: false, value: 0 },
            totalUsageLimit: c.usageRule?.totalUsageLimit ?? { isEnabled: false, value: 0 },
            totalUsageLimitPerUser: c.usageRule?.totalUsageLimitPerUser ?? { isEnabled: false, value: 0 },
            maximumApplicableDiscount: c.usageRule?.maximumApplicableDiscount ?? { isEnabled: false, value: 0 },
          });
          setShopExpiry(sanitizeShopExpiry(c.shopBasisPromoExpiry));
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load coupon"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, couponId]);

  const handleSave = async () => {
    if (!details.name.trim()) {
      toast.error("Please enter a coupon name");
      return;
    }
    if (!details.couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    if (restrictions.shouldTargetSetOfCustomers && restrictions.targetedCustomerIds.length === 0) {
      toast.error("Please select at least one targeted customer");
      return;
    }
    if (!shopExpiry.length) {
      toast.error("Please configure validity for at least one shop");
      return;
    }

    setSaving(true);
    try {
      const couponInfo = { ...details, ...restrictions, usageRule };
      if (mode === "add") {
        await createCoupon({ couponInfo, expiryInfo: { shopBasisPromoExpiry: shopExpiry } });
        toast.success("Coupon created successfully");
      } else {
        await updateCouponInfoAndRules(couponId!, couponInfo);
        await updateCouponExpiry(couponId!, shopExpiry);
        toast.success("Coupon updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.errors?.join(", ") || err?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={960}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Tag className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{mode === "add" ? "Add Coupon" : "Edit Coupon"}</div>
            <div className="text-xs leading-tight text-muted-foreground">Configure discount, restrictions, and validity</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
              <TabsList variant="line" className="w-full gap-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                <TabsTrigger value="general" className="flex-1">General Information</TabsTrigger>
                <TabsTrigger value="validity" className="flex-1">Validity &amp; Expiry</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="text-sm font-semibold">Coupon Information</div>
                    <Field label="Image">
                      <SingleImageUpload imageUrl={details.imageUrl} onChange={(imageUrl) => setDetails({ ...details, imageUrl })} />
                    </Field>
                    <Field label="Coupon Name" required>
                      <Input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                    </Field>
                    <Field label="Coupon Code" required>
                      <Input
                        value={details.couponCode}
                        onChange={(e) => setDetails({ ...details, couponCode: e.target.value.toUpperCase() })}
                      />
                    </Field>
                    <Field label="Description">
                      <Textarea
                        rows={3}
                        value={details.description}
                        onChange={(e) => setDetails({ ...details, description: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Discount Type">
                        <Select
                          items={COUPON_DISCOUNT_TYPE_ITEMS}
                          value={details.discountType}
                          onValueChange={(v) => setDetails({ ...details, discountType: v as string })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUPON_DISCOUNT_TYPE_ITEMS.map((i) => (
                              <SelectItem key={i.value} value={i.value}>
                                {i.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Discount Rate" required>
                        <Input
                          type="number"
                          min={0}
                          value={details.discountRate}
                          onChange={(e) => setDetails({ ...details, discountRate: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
                    <div className="pt-4 text-sm font-semibold">Restrictions</div>
                    <RestrictionsFields
                      value={restrictions}
                      onChange={(patch) => setRestrictions({ ...restrictions, ...patch })}
                      stackItems={COUPON_STACK_ITEMS}
                    />
                  </div>

                  <div className="flex flex-col gap-4 pt-2 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
                    <div className="pt-4 text-sm font-semibold">Usage Rules</div>
                    <UsageRuleFields value={usageRule} onChange={(patch) => setUsageRule({ ...usageRule, ...patch })} showMinimumOrderAmount />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="validity" className="mt-4">
                <ValidityScheduler value={shopExpiry} onChange={setShopExpiry} fetchScopedShopIds={fetchScopedShopIdsForCoupons} />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {tab !== "validity" && (
            <Button onClick={() => setTab(TAB_ORDER[TAB_ORDER.indexOf(tab as (typeof TAB_ORDER)[number]) + 1])} disabled={saving || loading}>
              Next
            </Button>
          )}
          {tab === "validity" && (
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
