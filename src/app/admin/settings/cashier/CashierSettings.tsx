"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingCart,
  CreditCard,
  Percent,
  User,
  Gift,
  Undo2,
  ChevronDown,
} from "lucide-react";

import { getShopPreference } from "@/services/sales/getShopPreference";
import { updateShopPreferences } from "@/services/sales/cashier";
import { fetchShopsData } from "@/services/shops/list";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import PaymentMethodCard from "./PaymentMethodCard";
import { EMPTY_PREFERENCES, type PaymentMethodKey, type ShopPreferences } from "./types";

const PAYMENT_METHOD_KEYS: PaymentMethodKey[] = ["CREDIT_CARD", "DEBIT_CARD", "CASHLESS_ATM", "ACH"];
const ECOMM_PAYMENT_METHOD_KEYS: PaymentMethodKey[] = ["CREDIT_CARD", "DEBIT_CARD", "ACH"];
const PAYMENT_TABS = ["POS", "iOS", "Android", "Web"] as const;
type PaymentTab = (typeof PAYMENT_TABS)[number];

const DISCOUNT_OPTIONS = [
  { value: "DEAL", label: "Deals" },
  { value: "COUPON", label: "Coupons" },
  { value: "LOYALTY_POINTS", label: "Loyalty Points" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
  { value: "CUSTOMER_TYPE", label: "Customer Type" },
];

function emptyMethod(paymentMethod: PaymentMethodKey) {
  return {
    paymentMethod,
    isEnabled: false,
    shouldForceMinimumSubtotal: false,
    minimumSubTotalToForce: 0,
    shouldTakeProcessingFee: false,
    processingFeePreferences: [],
  };
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6 break-inside-avoid">
      <div className="flex items-center gap-2 px-4 pb-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="flex flex-col gap-3 px-4">{children}</div>
    </Card>
  );
}

function PreferenceCheckbox({ label, checked, onCheckedChange }: { label: React.ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label className="-mx-2 flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
      <Checkbox checked={checked} onCheckedChange={(c) => onCheckedChange(!!c)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

export default function CashierSettings() {
  const [loading, setLoading] = useState(false);
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("POS");
  const [shops, setShops] = useState<{ id: string | number; name: string }[]>([]);
  const [preferences, setPreferences] = useState<ShopPreferences>(EMPTY_PREFERENCES);

  useEffect(() => {
    fetchShopsData().then((res) => {
      const shopIdToRemove = JSON.parse(localStorage.getItem("shopId") || "null");
      setShops((res?.data ?? []).filter((s: any) => s.id !== shopIdToRemove));
    });
  }, []);

  useEffect(() => {
    getShopPreference().then((res) => {
      const data = res?.data;
      if (!data?.preference) return;
      const pref = data.preference;
      const processMethods = (methods: any[]) =>
        (methods || []).map((m) => ({
          ...m,
          processingFeePreferences: (m.processingFeePreferences || []).map((fee: any) => ({
            ...fee,
            feeType: fee.feeType || (fee.chargeAmount < 0 ? "DISCOUNT" : "FEE"),
            chargeAmount: Math.abs(fee.chargeAmount || 0),
          })),
        }));
      const processEcomm = (ecomm: any) =>
        ecomm
          ? { ...ecomm, onlinePaymentPreferences: processMethods(ecomm.onlinePaymentPreferences) }
          : { shouldAllowInStorePayment: false, onlinePaymentPreferences: [] };

      setPreferences({
        ...EMPTY_PREFERENCES,
        ...pref,
        isChoosingCustomerGroupMandatoryForMJProducts: pref.isChoosingCustomerGroupMandatoryForMJProducts === true || pref.isChoosingCustomerGroupMandatoryForMJProducts === "true",
        shouldAllowManualEditOnPosPage: pref.shouldAllowManualEditOnPosPage === true || pref.shouldAllowManualEditOnPosPage === "true",
        posOnlinePaymentPreference: processMethods(pref.posOnlinePaymentPreference),
        appOnlinePaymentPreference: processMethods(pref.appOnlinePaymentPreference),
        ecommAndroidOnlinePaymentPreference: processEcomm(pref.ecommAndroidOnlinePaymentPreference),
        ecommIOSOnlinePaymentPreference: processEcomm(pref.ecommIOSOnlinePaymentPreference),
        ecommWEBOnlinePaymentPreference: processEcomm(pref.ecommWEBOnlinePaymentPreference),
      });
    });
  }, []);

  const set = <K extends keyof ShopPreferences>(key: K, value: ShopPreferences[K]) =>
    setPreferences((prev) => ({ ...prev, [key]: value }));

  const toggleDiscount = (discount: string, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      allowedDiscounts: checked ? [...prev.allowedDiscounts, discount] : prev.allowedDiscounts.filter((d) => d !== discount),
    }));
  };

  const updatePosMethod = (methodKey: PaymentMethodKey, updates: Partial<ReturnType<typeof emptyMethod>>) => {
    setPreferences((prev) => {
      const list = [...prev.posOnlinePaymentPreference];
      const idx = list.findIndex((m) => m.paymentMethod === methodKey);
      const current = idx >= 0 ? list[idx] : emptyMethod(methodKey);
      const next = { ...current, ...updates };
      if (updates.shouldTakeProcessingFee === true && (!current.processingFeePreferences || current.processingFeePreferences.length === 0)) {
        next.processingFeePreferences = [{ operator: "LT", amount: 0, type: "PERCENTAGE", chargeAmount: 0, feeType: "FEE" }];
      } else if (updates.shouldTakeProcessingFee === false) {
        next.processingFeePreferences = [];
      }
      if (idx >= 0) list[idx] = next;
      else list.push(next);
      return { ...prev, posOnlinePaymentPreference: list };
    });
  };

  const ecommKeyForTab: Record<Exclude<PaymentTab, "POS">, keyof ShopPreferences> = {
    iOS: "ecommIOSOnlinePaymentPreference",
    Android: "ecommAndroidOnlinePaymentPreference",
    Web: "ecommWEBOnlinePaymentPreference",
  };

  const updateEcommMethod = (prefKey: keyof ShopPreferences, methodKey: PaymentMethodKey, updates: Partial<ReturnType<typeof emptyMethod>>) => {
    setPreferences((prev) => {
      const ecomm = { ...(prev[prefKey] as any) };
      const list = [...(ecomm.onlinePaymentPreferences || [])];
      const idx = list.findIndex((m) => m.paymentMethod === methodKey);
      const current = idx >= 0 ? list[idx] : emptyMethod(methodKey);
      const next = { ...current, ...updates };
      if (updates.shouldTakeProcessingFee === true && (!current.processingFeePreferences || current.processingFeePreferences.length === 0)) {
        next.processingFeePreferences = [{ operator: "LT", amount: 0, type: "PERCENTAGE", chargeAmount: 0, feeType: "FEE" }];
      } else if (updates.shouldTakeProcessingFee === false) {
        next.processingFeePreferences = [];
      }
      if (idx >= 0) list[idx] = next;
      else list.push(next);
      return { ...prev, [prefKey]: { ...ecomm, onlinePaymentPreferences: list } };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const signTiers = (methods: any[]) =>
      (methods || []).map((m) => ({
        ...m,
        processingFeePreferences: (m.processingFeePreferences || []).map((fee: any) => {
          const { feeType, ...rest } = fee;
          return { ...rest, chargeAmount: feeType === "DISCOUNT" ? -Math.abs(rest.chargeAmount || 0) : Math.abs(rest.chargeAmount || 0) };
        }),
      }));
    const signEcomm = (ecomm: any) => ({ ...ecomm, onlinePaymentPreferences: signTiers(ecomm?.onlinePaymentPreferences) });

    const body = {
      shopId: JSON.parse(localStorage.getItem("shopId") || "null"),
      ...preferences,
      posOnlinePaymentPreference: signTiers(preferences.posOnlinePaymentPreference),
      appOnlinePaymentPreference: signTiers(preferences.appOnlinePaymentPreference),
      ecommAndroidOnlinePaymentPreference: signEcomm(preferences.ecommAndroidOnlinePaymentPreference),
      ecommIOSOnlinePaymentPreference: signEcomm(preferences.ecommIOSOnlinePaymentPreference),
      ecommWEBOnlinePaymentPreference: signEcomm(preferences.ecommWEBOnlinePaymentPreference),
    };

    try {
      await updateShopPreferences(body);
      toast.success("Store preference updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const findMethod = (list: any[], key: PaymentMethodKey) => list?.find((m) => m.paymentMethod === key) || emptyMethod(key);

  const selectedShopNames = shops.filter((s) => preferences.allowedStoresForAcceptingStoreCredits.includes(s.id)).map((s) => s.name);
  const [storeSelectOpen, setStoreSelectOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Shop Preferences</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="columns-1 lg:columns-2 xl:columns-3 gap-6">
            <SectionCard icon={<ShoppingCart className="size-4 text-primary" />} title="Sales Preferences">
              <PreferenceCheckbox
                label="Allow sales of out of stock packages"
                checked={preferences.shouldAllowOutOfStockPackagesToSell}
                onCheckedChange={(v) => set("shouldAllowOutOfStockPackagesToSell", v)}
              />
              <PreferenceCheckbox
                label="Allow sales on items below cost"
                checked={preferences.shouldAllowSaleBelowCost}
                onCheckedChange={(v) => set("shouldAllowSaleBelowCost", v)}
              />
              <PreferenceCheckbox
                label="Is selecting a cash drawer required for cash payments in the physical store?"
                checked={preferences.isChoosingDrawerMandatoryForCashSaleOnPhysicalStore}
                onCheckedChange={(v) => set("isChoosingDrawerMandatoryForCashSaleOnPhysicalStore", v)}
              />
              <PreferenceCheckbox
                label="Send receipt via email"
                checked={preferences.sendOrderReceiptViaEmail}
                onCheckedChange={(v) => set("sendOrderReceiptViaEmail", v)}
              />
              <PreferenceCheckbox
                label="Is selecting a cash drawer required for virtual payments (Credit/Debit/ATM) in the physical store?"
                checked={preferences.isChoosingDrawerMandatoryForVirtualSaleOnPhysicalStore}
                onCheckedChange={(v) => set("isChoosingDrawerMandatoryForVirtualSaleOnPhysicalStore", v)}
              />
              <PreferenceCheckbox
                label="Only add items to cart through scanning"
                checked={preferences.shouldEnableScanOnlyCart}
                onCheckedChange={(v) => set("shouldEnableScanOnlyCart", v)}
              />
              {preferences.shouldEnableScanOnlyCart && (
                <div className="ml-6">
                  <PreferenceCheckbox
                    label="Allow manual product quantity editing on the POS page"
                    checked={preferences.shouldAllowManualEditOnPosPage}
                    onCheckedChange={(v) => set("shouldAllowManualEditOnPosPage", v)}
                  />
                </div>
              )}
              <PreferenceCheckbox
                label="Require customer group selection for MJ products"
                checked={preferences.isChoosingCustomerGroupMandatoryForMJProducts}
                onCheckedChange={(v) => set("isChoosingCustomerGroupMandatoryForMJProducts", v)}
              />
            </SectionCard>

            <SectionCard icon={<Gift className="size-4 text-primary" />} title="Allowed Discount Methods">
              {DISCOUNT_OPTIONS.map((opt) => (
                <PreferenceCheckbox
                  key={opt.value}
                  label={opt.label}
                  checked={preferences.allowedDiscounts.includes(opt.value)}
                  onCheckedChange={(v) => toggleDiscount(opt.value, v)}
                />
              ))}
            </SectionCard>

            <SectionCard icon={<Undo2 className="size-4 text-primary" />} title="Return Policy Preferences">
              <PreferenceCheckbox
                label="Set maximum days for accepting returns"
                checked={preferences.shouldImposeDayLimitsOnAcceptingReturns}
                onCheckedChange={(v) => set("shouldImposeDayLimitsOnAcceptingReturns", v)}
              />
              {preferences.shouldImposeDayLimitsOnAcceptingReturns && (
                <div className="ml-6">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    className="w-32"
                    placeholder="Number of days"
                    value={preferences.numberOfDaysAllowedForAcceptingReturns}
                    onChange={(e) => set("numberOfDaysAllowedForAcceptingReturns", Number(e.target.value) || 0)}
                  />
                </div>
              )}
            </SectionCard>

            <SectionCard icon={<User className="size-4 text-primary" />} title="Customer Data Preference">
              <PreferenceCheckbox
                label="Allow anonymous customers"
                checked={preferences.shouldAllowAnonymousCustomer}
                onCheckedChange={(v) => set("shouldAllowAnonymousCustomer", v)}
              />
              <PreferenceCheckbox
                label="Hide personal identifications fields on the customer form"
                checked={preferences.shouldHidePIFieldsFromForm}
                onCheckedChange={(v) => set("shouldHidePIFieldsFromForm", v)}
              />
            </SectionCard>

            <SectionCard icon={<Gift className="size-4 text-primary" />} title="Store Credits Preference">
              <PreferenceCheckbox
                label="Allow Store Credits Across the Organization"
                checked={preferences.shouldAllowStoreCreditsToBeUsedAcrossTheOrganization}
                onCheckedChange={(v) => set("shouldAllowStoreCreditsToBeUsedAcrossTheOrganization", v)}
              />
              {!preferences.shouldAllowStoreCreditsToBeUsedAcrossTheOrganization && (
                <div className="ml-6">
                  <p className="mb-2 text-sm font-medium">Select Shop For Accepting Store Credits</p>
                  <Popover open={storeSelectOpen} onOpenChange={setStoreSelectOpen}>
                    <PopoverTrigger className="flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm outline-none dark:bg-input/30">
                      <span className={`truncate text-left ${selectedShopNames.length === 0 ? "text-muted-foreground" : ""}`}>
                        {selectedShopNames.length > 0 ? selectedShopNames.join(", ") : "Select Shop"}
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-1.5" align="start">
                      <div className="max-h-56 overflow-y-auto">
                        {shops.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">No shops</div>}
                        {shops.map((shop) => (
                          <label key={shop.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted">
                            <Checkbox
                              checked={preferences.allowedStoresForAcceptingStoreCredits.includes(shop.id)}
                              onCheckedChange={(checked) =>
                                set(
                                  "allowedStoresForAcceptingStoreCredits",
                                  checked
                                    ? [...preferences.allowedStoresForAcceptingStoreCredits, shop.id]
                                    : preferences.allowedStoresForAcceptingStoreCredits.filter((id) => id !== shop.id)
                                )
                              }
                            />
                            <span className="truncate">{shop.name}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </SectionCard>

            <SectionCard icon={<Percent className="size-4 text-primary" />} title="Pricing Calculation Preferences">
              <PreferenceCheckbox
                label="Round up final payment"
                checked={preferences.shouldRoundUpCalculation}
                onCheckedChange={(v) => set("shouldRoundUpCalculation", v)}
              />

              {preferences.shouldRoundUpCalculation && (
                <div className="ml-6 flex flex-col gap-2">
                  <PreferenceCheckbox
                    label="Maintain whole numbers only"
                    checked={preferences.shouldKeepIntegerOnly}
                    onCheckedChange={(v) => {
                      set("shouldKeepIntegerOnly", v);
                      if (v) {
                        set("shouldConsiderCentsToRound", false);
                        set("shouldRoundUpToTheClosestNickel", false);
                      }
                    }}
                  />
                  <PreferenceCheckbox
                    label="Round to the nearest 5 cents"
                    checked={preferences.shouldRoundUpToTheClosestNickel}
                    onCheckedChange={(v) => {
                      set("shouldRoundUpToTheClosestNickel", v);
                      if (v) {
                        set("shouldKeepIntegerOnly", false);
                        set("shouldConsiderCentsToRound", false);
                      }
                    }}
                  />
                  <PreferenceCheckbox
                    label="Enter the number of cents to round up from"
                    checked={preferences.shouldConsiderCentsToRound}
                    onCheckedChange={(v) => {
                      set("shouldConsiderCentsToRound", v);
                      if (v) {
                        set("shouldKeepIntegerOnly", false);
                        set("shouldRoundUpToTheClosestNickel", false);
                      }
                    }}
                  />
                  {preferences.shouldConsiderCentsToRound && (
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      className="w-32"
                      value={preferences.centsToConsiderToRound}
                      onChange={(e) => set("centsToConsiderToRound", Number(e.target.value) || 0)}
                    />
                  )}
                </div>
              )}

              <PreferenceCheckbox
                label="Stop matching the price of line items to the rounded total price of the order"
                checked={preferences.shouldStopLineItemsToBeAlignedWithRoundingSubtotal}
                onCheckedChange={(v) => set("shouldStopLineItemsToBeAlignedWithRoundingSubtotal", v)}
              />
            </SectionCard>
      </div>

      {/* Payment Settings - full width */}
      <Card size="sm">
        <div className="flex items-center gap-2 px-4 pb-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CreditCard className="size-4" />
          </div>
          <h3 className="text-sm font-semibold">Payment Settings</h3>
        </div>

        <div className="px-4">
          <div className="mb-4 flex w-full rounded-lg bg-muted p-0.5">
            {PAYMENT_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setPaymentTab(tab)}
                className={`flex-1 rounded-[7px] py-2 text-sm font-medium transition-colors ${
                  paymentTab === tab ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/60"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {paymentTab === "POS" && (
            <div className="flex flex-col gap-3">
              {PAYMENT_METHOD_KEYS.map((key) => (
                <PaymentMethodCard
                  key={key}
                  methodKey={key}
                  method={findMethod(preferences.posOnlinePaymentPreference, key)}
                  onUpdate={(updates) => updatePosMethod(key, updates)}
                />
              ))}
            </div>
          )}

          {paymentTab !== "POS" && (
            <div className="flex flex-col gap-3">
              {(() => {
                const prefKey = ecommKeyForTab[paymentTab as Exclude<PaymentTab, "POS">];
                const ecomm = preferences[prefKey] as any;
                return (
                  <>
                    <div className="flex items-center justify-between rounded-xl px-4 py-3 ring-1 ring-foreground/10">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                          <ShoppingCart className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Allow In-Store Payment</p>
                          <p className="text-xs text-muted-foreground">Enable in-store payment for {paymentTab} {paymentTab === "Web" ? "store" : "app"}</p>
                        </div>
                      </div>
                      <Switch
                        checked={ecomm?.shouldAllowInStorePayment || false}
                        onCheckedChange={(checked) => set(prefKey, { ...ecomm, shouldAllowInStorePayment: checked })}
                      />
                    </div>
                    {ECOMM_PAYMENT_METHOD_KEYS.map((key) => (
                      <PaymentMethodCard
                        key={key}
                        methodKey={key}
                        method={findMethod(ecomm?.onlinePaymentPreferences, key)}
                        onUpdate={(updates) => updateEcommMethod(prefKey, key, updates)}
                      />
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
