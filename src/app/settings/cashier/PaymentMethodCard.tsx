"use client";

import { Plus, Trash2 } from "lucide-react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { PaymentMethodKey, PaymentMethodPreference } from "./types";

const OPERATOR_OPTIONS = [
  { value: "LT", label: "Less than" },
  { value: "GT", label: "Greater than" },
];
const AMOUNT_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "AMOUNT", label: "Fixed Amount" },
];
const FEE_TYPE_OPTIONS = [
  { value: "FEE", label: "Fee" },
  { value: "DISCOUNT", label: "Discount" },
];

function ProcessingFeeTiers({
  method,
  onUpdateTier,
  onAddTier,
  onRemoveTier,
}: {
  method: PaymentMethodPreference;
  onUpdateTier: (index: number, updates: Partial<PaymentMethodPreference["processingFeePreferences"][number]>) => void;
  onAddTier: () => void;
  onRemoveTier: (index: number) => void;
}) {
  if (!method.shouldTakeProcessingFee) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Processing Fee Tiers</p>
      <div className="flex flex-col gap-2">
        {method.processingFeePreferences?.map((fee, index) => {
          const displayChargeAmount = Math.abs(fee.chargeAmount || 0);
          return (
            <div key={index} className="rounded-lg p-3 ring-1 ring-foreground/10">
              <p className="mb-2 text-xs text-muted-foreground">
                If amount is <strong>{fee.operator === "LT" ? "less than" : "greater than"}</strong> ${fee.amount || 0}, apply{" "}
                {fee.type === "PERCENTAGE" ? `${displayChargeAmount}%` : `$${displayChargeAmount}`} {fee.feeType === "DISCOUNT" ? "discount" : "fee"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select items={OPERATOR_OPTIONS} value={fee.operator} onValueChange={(v) => onUpdateTier(index, { operator: v as any })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    className="w-24"
                    placeholder="Threshold"
                    value={fee.amount}
                    onChange={(e) => onUpdateTier(index, { amount: Number(e.target.value) || 0 })}
                  />
                </div>

                <span className="text-sm">apply</span>

                <div className="flex items-center gap-1">
                  {fee.type === "PERCENTAGE" && <span className="text-sm">%</span>}
                  {fee.type === "AMOUNT" && <span className="text-sm">$</span>}
                  <Input
                    type="number"
                    min={0}
                    className="w-24"
                    placeholder="Charge Amount"
                    value={displayChargeAmount}
                    onChange={(e) => onUpdateTier(index, { chargeAmount: Number(e.target.value) || 0 })}
                  />
                </div>

                <Select items={AMOUNT_TYPE_OPTIONS} value={fee.type} onValueChange={(v) => onUpdateTier(index, { type: v as any })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AMOUNT_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select items={FEE_TYPE_OPTIONS} value={fee.feeType} onValueChange={(v) => onUpdateTier(index, { feeType: v as any })}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon-sm" onClick={() => onRemoveTier(index)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="mt-2" onClick={onAddTier}>
        <Plus className="size-3.5" /> Add Processing Fee Tier
      </Button>
    </div>
  );
}

const ICON_STYLES: Record<PaymentMethodKey, string> = {
  CREDIT_CARD: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  DEBIT_CARD: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  CASHLESS_ATM: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  ACH: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
};

const LABELS: Record<PaymentMethodKey, { label: string; description: string }> = {
  CREDIT_CARD: { label: "Credit Card", description: "Online credit card payments" },
  DEBIT_CARD: { label: "Debit Card", description: "Online debit card payments" },
  CASHLESS_ATM: { label: "Bleaum Digital Debit", description: "Cashless ATM transactions" },
  ACH: { label: "ACH", description: "Bank transfer payments" },
};

export default function PaymentMethodCard({
  methodKey,
  method,
  onUpdate,
}: {
  methodKey: PaymentMethodKey;
  method: PaymentMethodPreference;
  onUpdate: (updates: Partial<PaymentMethodPreference>) => void;
}) {
  const { label, description } = LABELS[methodKey];

  const updateTier = (index: number, updates: Partial<PaymentMethodPreference["processingFeePreferences"][number]>) => {
    const tiers = [...method.processingFeePreferences];
    tiers[index] = { ...tiers[index], ...updates };
    onUpdate({ processingFeePreferences: tiers });
  };

  const addTier = () => {
    onUpdate({
      processingFeePreferences: [
        ...(method.processingFeePreferences || []),
        { operator: "LT", amount: 0, type: "PERCENTAGE", chargeAmount: 0, feeType: "FEE" },
      ],
    });
  };

  const removeTier = (index: number) => {
    onUpdate({ processingFeePreferences: method.processingFeePreferences.filter((_, i) => i !== index) });
  };

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-9 items-center justify-center rounded-lg ${ICON_STYLES[methodKey]}`}>
            <CreditCard className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch checked={method.isEnabled} onCheckedChange={(checked) => onUpdate({ isEnabled: checked })} />
      </div>

      {method.isEnabled && (
        <div className="flex flex-col gap-3 bg-muted/40 px-4 py-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={method.shouldForceMinimumSubtotal}
                onCheckedChange={(checked) => onUpdate({ shouldForceMinimumSubtotal: !!checked })}
              />
              Force Minimum Subtotal
            </label>
            {method.shouldForceMinimumSubtotal && (
              <div className="mt-2 ml-6">
                <Input
                  type="number"
                  className="w-40"
                  placeholder="Minimum Amount"
                  value={method.minimumSubTotalToForce}
                  onChange={(e) => onUpdate({ minimumSubTotalToForce: Number(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={method.shouldTakeProcessingFee}
              onCheckedChange={(checked) => onUpdate({ shouldTakeProcessingFee: !!checked })}
            />
            Take Processing Fee
          </label>

          <ProcessingFeeTiers method={method} onUpdateTier={updateTier} onAddTier={addTier} onRemoveTier={removeTier} />
        </div>
      )}
    </div>
  );
}
