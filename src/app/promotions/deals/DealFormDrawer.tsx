"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, Gift, Layers, X } from "lucide-react";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";
import { RestrictionsFields, EMPTY_RESTRICTIONS, type RestrictionsValue } from "@/components/promotions/RestrictionsFields";
import { UsageRuleFields, EMPTY_USAGE_RULE, type UsageRuleValue } from "@/components/promotions/UsageRuleFields";
import { ValidityScheduler, type ShopExpiry } from "@/components/promotions/ValidityScheduler";
import { DEAL_STACK_ITEMS } from "@/services/promotions/enums";
import { fetchScopedShopIdsForDeals } from "@/services/deals/scopedShops";

import { RegularDealFields } from "./RegularDealFields";
import { BogoDealFields } from "./BogoDealFields";
import { TieredDealFields } from "./TieredDealFields";
import {
  EMPTY_REGULAR_DEAL_INFO,
  EMPTY_BOGO_DEAL_INFO,
  EMPTY_TIERED_DEAL_INFO,
  type DealType,
  type RegularDealInfoValue,
  type BogoDealInfoValue,
  type TieredDealInfoValue,
} from "./types";

import { fetchSingleRegularDeal } from "@/services/deals/regular/getSingle";
import { createRegularDeal } from "@/services/deals/regular/create";
import { updateRegularDeal } from "@/services/deals/regular/update";
import { updateRegularDealExpiry } from "@/services/deals/regular/updateExpiry";

import { fetchSingleBogoDeal } from "@/services/deals/bogo/getSingle";
import { createBogoDeal } from "@/services/deals/bogo/create";
import { updateBogoDeal } from "@/services/deals/bogo/update";
import { updateBogoDealExpiry } from "@/services/deals/bogo/updateExpiry";

import { fetchSingleTieredDeal } from "@/services/deals/tiered/getSingle";
import { createTieredDeal } from "@/services/deals/tiered/create";
import { updateTieredDeal } from "@/services/deals/tiered/update";
import { updateTieredDealExpiry } from "@/services/deals/tiered/updateExpiry";

interface CommonValue {
  name: string;
  description: string;
  imageUrl: string | null;
}

const EMPTY_COMMON: CommonValue = { name: "", description: "", imageUrl: null };

const TYPE_CARDS: { type: DealType; label: string; description: string; icon: typeof BadgePercent }[] = [
  { type: "REGULAR", label: "Regular", description: "Percentage or amount off categories, brands, or products", icon: BadgePercent },
  { type: "BOGO", label: "Buy One Get One", description: "Buy X, get a discount on Y", icon: Gift },
  { type: "TIERED", label: "Tiered", description: "Escalating discounts by quantity, weight, or spend", icon: Layers },
];

function idsOf(list: any[] | undefined) {
  return (list ?? []).map((x) => x.id);
}

export default function DealFormDrawer({
  open,
  mode,
  dealId,
  dealType: initialDealType,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "add" | "edit";
  dealId: string | number | null;
  dealType: DealType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dealType, setDealType] = useState<DealType | null>(null);
  const [tab, setTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [common, setCommon] = useState<CommonValue>(EMPTY_COMMON);
  const [restrictions, setRestrictions] = useState<RestrictionsValue>(EMPTY_RESTRICTIONS);
  const [usageRule, setUsageRule] = useState<UsageRuleValue>(EMPTY_USAGE_RULE);
  const [shopExpiry, setShopExpiry] = useState<ShopExpiry[]>([]);

  const [regularInfo, setRegularInfo] = useState<RegularDealInfoValue>(EMPTY_REGULAR_DEAL_INFO);
  const [bogoInfo, setBogoInfo] = useState<BogoDealInfoValue>(EMPTY_BOGO_DEAL_INFO);
  const [tieredInfo, setTieredInfo] = useState<TieredDealInfoValue>(EMPTY_TIERED_DEAL_INFO);

  useEffect(() => {
    if (!open) return;
    setTab("details");

    if (mode === "add") {
      setDealType(null);
      setCommon(EMPTY_COMMON);
      setRestrictions(EMPTY_RESTRICTIONS);
      setUsageRule(EMPTY_USAGE_RULE);
      setShopExpiry([]);
      setRegularInfo(EMPTY_REGULAR_DEAL_INFO);
      setBogoInfo(EMPTY_BOGO_DEAL_INFO);
      setTieredInfo(EMPTY_TIERED_DEAL_INFO);
      return;
    }

    if (mode === "edit" && dealId && initialDealType) {
      setDealType(initialDealType);
      setLoading(true);
      const fetcher =
        initialDealType === "REGULAR" ? fetchSingleRegularDeal : initialDealType === "BOGO" ? fetchSingleBogoDeal : fetchSingleTieredDeal;
      fetcher(dealId)
        .then((res) => {
          const d = res?.data;
          if (!d) {
            toast.error("Deal not found");
            return;
          }
          setCommon({ name: d.name ?? "", description: d.description ?? "", imageUrl: d.imageUrl ?? null });
          setRestrictions({
            shouldConsiderCustomerTypes: !!d.shouldConsiderCustomerTypes,
            allowedCustomerTypeIds: idsOf(d.allowedCustomerTypes),
            shouldConsiderCustomerGroups: !!d.shouldConsiderCustomerGroups,
            allowedCustomerGroupIds: idsOf(d.allowedCustomerGroups),
            allowAllSaleSources: d.allowAllSaleSources ?? true,
            allowedSaleSources: d.allowedSaleSources ?? [],
            allowAllDeliveryMethods: d.allowAllDeliveryMethods ?? true,
            allowedDeliveryMethods: d.allowedDeliveryMethods ?? [],
            allowedStacks: d.allowedStacks ?? [],
            shouldTargetSetOfCustomers: !!d.shouldTargetSetOfCustomers,
            targetedCustomerIds: idsOf(d.targetedCustomers),
          });
          setUsageRule({
            isApplicable: !!d.usageRule?.isApplicable,
            minimumOrderAmount: { isEnabled: false, value: 0 },
            totalUsageLimit: d.usageRule?.totalUsageLimit ?? { isEnabled: false, value: 0 },
            totalUsageLimitPerUser: d.usageRule?.totalUsageLimitPerUser ?? { isEnabled: false, value: 0 },
            maximumApplicableDiscount: d.usageRule?.maximumApplicableDiscount ?? { isEnabled: false, value: 0 },
          });
          setShopExpiry(d.shopBasisPromoExpiry ?? []);

          if (initialDealType === "REGULAR") {
            const info = d.regularDealInfo;
            setRegularInfo({
              discountType: info?.discountType ?? "PERCENTAGE",
              discountRate: info?.discountRate ?? 0,
              targetEntity: info?.targetEntity ?? "PRODUCTS",
              associatedCategoryIds: idsOf(info?.associatedCategories),
              associatedBrandIds: idsOf(info?.associatedBrands),
              associatedProductIds: idsOf(info?.associatedProducts),
              productExceptionIds: idsOf(info?.productExceptions),
              packageExceptionIds: idsOf(info?.packageExceptions),
              isPerLineItemPriceRestrictionEnabled: !!info?.isPerLineItemPriceRestrictionEnabled,
              perLineItemPriceRestrictionAmount: info?.perLineItemPriceRestrictionAmount ?? 0,
            });
          } else if (initialDealType === "BOGO") {
            const info = d.bogoDealinfo ?? d.bogoDealInfo;
            setBogoInfo({
              buyMinimumExactQuantity: info?.buyMinimumExactQuantity ?? 2,
              buyProductScope: info?.buyProductScope ?? "PRODUCTS",
              buyProductIds: idsOf(info?.buyProducts),
              buyProductCategoryIds: idsOf(info?.buyProductCategories),
              buyProductBrandIds: idsOf(info?.buyProductBrands),
              buyProductExceptionIds: idsOf(info?.buyProductExceptions),
              buyProductPackageExceptionIds: idsOf(info?.buyProductPackageExceptions),
              getProductQuantity: info?.getProductQuantity ?? 1,
              getProductType: info?.getProductType ?? "SELF",
              getProductIds: idsOf(info?.getProducts),
              getProductCategoryIds: idsOf(info?.getProductCategories),
              getProductBrandIds: idsOf(info?.getProductBrands),
              getProductExceptionIds: idsOf(info?.getProductExceptions),
              getProductPackageExceptionIds: idsOf(info?.getProductPackageExceptions),
              isGetProductAmountCapApplicable: !!info?.isGetProductAmountCapApplicable,
              getProductAmountCap: info?.getProductAmountCap ?? 0,
              discountType: info?.discountType ?? "PERCENTAGE",
              discountRate: info?.discountRate ?? 0,
              discountTargetType: info?.discountTargetType ?? "ON_GET_PRODUCT",
              userPickedProductScopes: info?.userPickedProductScopes ?? "PRODUCTS",
            });
          } else {
            const info = d.tieredDealInfo;
            setTieredInfo({
              measurementType: info?.measurementType ?? "WEIGHT",
              tiers: info?.tiers?.length ? info.tiers : EMPTY_TIERED_DEAL_INFO.tiers,
              targetEntity: info?.targetEntity ?? "PRODUCTS",
              associatedCategoryIds: idsOf(info?.associatedCategories),
              associatedBrandIds: idsOf(info?.associatedBrands),
              associatedProductIds: idsOf(info?.associatedProducts),
              associatedTagIds: idsOf(info?.associatedTags),
              productExceptionIds: idsOf(info?.productExceptions),
              packageExceptionIds: idsOf(info?.packageExceptions),
              shouldAllowAutoApply: !!info?.shouldAllowAutoApply,
              shouldAllowMixAndMatch: !!info?.shouldAllowMixAndMatch,
            });
          }
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load deal"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, dealId, initialDealType]);

  const handleSave = async () => {
    if (!dealType) return;
    if (!common.name.trim()) {
      toast.error("Please enter a deal name");
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
      const commonInfo = { ...common, ...restrictions, usageRule };
      const expiryInfo = { shopBasisPromoExpiry: shopExpiry };

      if (mode === "add") {
        if (dealType === "REGULAR") await createRegularDeal({ commonInfo, expiryInfo, regularDealInfo: regularInfo });
        else if (dealType === "BOGO") await createBogoDeal({ commonInfo, expiryInfo, bogoDealInfo: bogoInfo });
        else await createTieredDeal({ commonInfo, expiryInfo, tieredDealInfo: tieredInfo });
        toast.success("Deal created successfully");
      } else {
        if (dealType === "REGULAR") {
          await updateRegularDeal(dealId!, { commonInfo, regularDealInfo: regularInfo });
          await updateRegularDealExpiry(dealId!, shopExpiry);
        } else if (dealType === "BOGO") {
          await updateBogoDeal(dealId!, { commonInfo, bogoDealInfo: bogoInfo });
          await updateBogoDealExpiry(dealId!, shopExpiry);
        } else {
          await updateTieredDeal(dealId!, { commonInfo, tieredDealInfo: tieredInfo });
          await updateTieredDealExpiry(dealId!, shopExpiry);
        }
        toast.success("Deal updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.errors?.join(", ") || err?.message || "Failed to save deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BadgePercent className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{mode === "add" ? "Add Deal" : "Edit Deal"}</div>
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
          ) : !dealType ? (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium">Choose a deal type</div>
              {TYPE_CARDS.map(({ type, label, description, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDealType(type)}
                  className="flex items-center gap-3 rounded-lg p-4 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-4.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
              <TabsList variant="line" className="w-full gap-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                <TabsTrigger value="type" className="flex-1">{dealType === "REGULAR" ? "Discount" : dealType === "BOGO" ? "BOGO" : "Tiers"}</TabsTrigger>
                <TabsTrigger value="restrictions" className="flex-1">Restrictions</TabsTrigger>
                <TabsTrigger value="usage" className="flex-1">Usage Rules</TabsTrigger>
                <TabsTrigger value="validity" className="flex-1">Validity</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <div className="flex flex-col gap-4">
                  <Field label="Image">
                    <SingleImageUpload imageUrl={common.imageUrl} onChange={(imageUrl) => setCommon({ ...common, imageUrl })} />
                  </Field>
                  <Field label="Deal Name" required>
                    <Input value={common.name} onChange={(e) => setCommon({ ...common, name: e.target.value })} />
                  </Field>
                  <Field label="Description">
                    <Textarea rows={3} value={common.description} onChange={(e) => setCommon({ ...common, description: e.target.value })} />
                  </Field>
                </div>
              </TabsContent>

              <TabsContent value="type" className="mt-4">
                {dealType === "REGULAR" && <RegularDealFields value={regularInfo} onChange={(patch) => setRegularInfo({ ...regularInfo, ...patch })} />}
                {dealType === "BOGO" && <BogoDealFields value={bogoInfo} onChange={(patch) => setBogoInfo({ ...bogoInfo, ...patch })} />}
                {dealType === "TIERED" && <TieredDealFields value={tieredInfo} onChange={(patch) => setTieredInfo({ ...tieredInfo, ...patch })} />}
              </TabsContent>

              <TabsContent value="restrictions" className="mt-4">
                <RestrictionsFields value={restrictions} onChange={(patch) => setRestrictions({ ...restrictions, ...patch })} stackItems={DEAL_STACK_ITEMS} />
              </TabsContent>

              <TabsContent value="usage" className="mt-4">
                <UsageRuleFields value={usageRule} onChange={(patch) => setUsageRule({ ...usageRule, ...patch })} showMinimumOrderAmount={false} />
              </TabsContent>

              <TabsContent value="validity" className="mt-4">
                <ValidityScheduler value={shopExpiry} onChange={setShopExpiry} fetchScopedShopIds={fetchScopedShopIdsForDeals} />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {dealType && (
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
