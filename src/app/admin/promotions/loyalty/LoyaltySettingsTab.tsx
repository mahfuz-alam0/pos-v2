"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";
import { LOYALTY_RESTRICTION_POLICY_ITEMS, LOYALTY_REWARD_TYPE_ITEMS, LOYALTY_STACK_ITEMS } from "@/services/promotions/enums";
import { fetchLoyaltySettings } from "@/services/loyaltySettings/get";
import { updateLoyaltySettings } from "@/services/loyaltySettings/update";
import { EMPTY_LOYALTY_SETTINGS, type LoyaltySettingsValue } from "./types";

export default function LoyaltySettingsTab() {
  const [value, setValue] = useState<LoyaltySettingsValue>(EMPTY_LOYALTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLoyaltySettings()
      .then((res) => {
        const s = res?.data;
        if (s) setValue({ ...EMPTY_LOYALTY_SETTINGS, ...s });
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load loyalty settings"))
      .finally(() => setLoading(false));
  }, []);

  const patch = (p: Partial<LoyaltySettingsValue>) => setValue((v) => ({ ...v, ...p }));

  const toggleStack = (val: string) => {
    patch({ allowedStacks: value.allowedStacks.includes(val) ? value.allowedStacks.filter((s) => s !== val) : [...value.allowedStacks, val] });
  };

  const updateTier = (i: number, p: Partial<LoyaltySettingsValue["tiers"][number]>) => {
    patch({ tiers: value.tiers.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });
  };
  const addTier = () => patch({ tiers: [...value.tiers, { minimumAmountToBeSpent: 0, pointsToBeGiven: 0 }] });
  const removeTier = (i: number) => patch({ tiers: value.tiers.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLoyaltySettings(value);
      toast.success("Loyalty settings saved");
    } catch (err: any) {
      toast.error(err?.errors?.join(", ") || err?.message || "Failed to save loyalty settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Loyalty Program Enabled</div>
          <div className="text-xs text-muted-foreground">Turn off to disable earning/redeeming loyalty points entirely</div>
        </div>
        <Switch checked={value.isEnabled} onCheckedChange={(c) => patch({ isEnabled: !!c })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Points Representation">
          <Input type="number" min={0} value={value.pointsRepresentation} onChange={(e) => patch({ pointsRepresentation: Number(e.target.value) })} />
        </Field>
        <Field label="Equivalent Dollar Amount">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={value.amountRepresentation}
            onChange={(e) => patch({ amountRepresentation: Number(e.target.value) })}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        e.g. {value.pointsRepresentation} point(s) = ${value.amountRepresentation}
      </p>

      <div className="flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="flex-1">
          <div className="text-sm font-medium">Registration Award</div>
          <div className="text-xs text-muted-foreground">Points given when a customer registers</div>
        </div>
        <Switch checked={value.registrationAward.isEnabled} onCheckedChange={(c) => patch({ registrationAward: { ...value.registrationAward, isEnabled: !!c } })} />
        {value.registrationAward.isEnabled && (
          <Input
            type="number"
            min={0}
            className="h-8 w-24"
            value={value.registrationAward.pointsToBeGiven}
            onChange={(e) => patch({ registrationAward: { ...value.registrationAward, pointsToBeGiven: Number(e.target.value) } })}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg p-3 ring-1 ring-foreground/10">
        <div className="flex-1">
          <div className="text-sm font-medium">First Order Award</div>
          <div className="text-xs text-muted-foreground">Points given after the customer's first order</div>
        </div>
        <Switch checked={value.firstOrderAward.isEnabled} onCheckedChange={(c) => patch({ firstOrderAward: { ...value.firstOrderAward, isEnabled: !!c } })} />
        {value.firstOrderAward.isEnabled && (
          <Input
            type="number"
            min={0}
            className="h-8 w-24"
            value={value.firstOrderAward.pointsToBeGiven}
            onChange={(e) => patch({ firstOrderAward: { ...value.firstOrderAward, pointsToBeGiven: Number(e.target.value) } })}
          />
        )}
      </div>

      <Field label="Earning Strategy">
        <Select items={LOYALTY_REWARD_TYPE_ITEMS} value={value.rewardStrategyType} onValueChange={(v) => patch({ rewardStrategyType: v as any })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOYALTY_REWARD_TYPE_ITEMS.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {value.rewardStrategyType === "PER_SPENDING_BASIS" && (
        <Field label="Points Given Per Spending Basis">
          <Input
            type="number"
            min={0}
            value={value.pointsToBeGivenPerSpendingBasis}
            onChange={(e) => patch({ pointsToBeGivenPerSpendingBasis: Number(e.target.value) })}
          />
        </Field>
      )}

      {value.rewardStrategyType === "TIERED_SPENDING_BASIS" && (
        <Field label="Spending Tiers">
          <div className="flex flex-col gap-2">
            {value.tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg p-2.5 ring-1 ring-foreground/10">
                <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="Min. spent"
                  className="h-8"
                  value={tier.minimumAmountToBeSpent}
                  onChange={(e) => updateTier(i, { minimumAmountToBeSpent: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Points given"
                  className="h-8"
                  value={tier.pointsToBeGiven}
                  onChange={(e) => updateTier(i, { pointsToBeGiven: Number(e.target.value) })}
                />
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
      )}

      <div className="flex items-center justify-between rounded-lg p-3 ring-1 ring-foreground/10">
        <div>
          <div className="text-sm font-medium">Restrict Point Redemption</div>
          <div className="text-xs text-muted-foreground">Cap how much of an order can be paid with points</div>
        </div>
        <Switch checked={value.isRestrictionEnabled} onCheckedChange={(c) => patch({ isRestrictionEnabled: !!c })} />
      </div>
      {value.isRestrictionEnabled && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Restriction Policy">
            <Select items={LOYALTY_RESTRICTION_POLICY_ITEMS} value={value.restrictionPolicy} onValueChange={(v) => patch({ restrictionPolicy: v as string })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOYALTY_RESTRICTION_POLICY_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Restriction Value">
            <Input
              type="number"
              min={0}
              value={value.restrictionValueRepresentation}
              onChange={(e) => patch({ restrictionValueRepresentation: Number(e.target.value) })}
            />
          </Field>
        </div>
      )}

      <Field label="Allow Stacking With">
        <div className="flex flex-col gap-2">
          {LOYALTY_STACK_ITEMS.map((item) => (
            <label key={item.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={value.allowedStacks.includes(item.value)} onCheckedChange={() => toggleStack(item.value)} />
              {item.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Contact Requirements to Redeem Points">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.isEmailRequiredToUseLoyaltyPoints}
              onCheckedChange={(c) => patch({ isEmailRequiredToUseLoyaltyPoints: !!c })}
            />
            Require email on file
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.isPhoneRequiredToUseLoyaltyPoints}
              onCheckedChange={(c) => patch({ isPhoneRequiredToUseLoyaltyPoints: !!c })}
            />
            Require phone on file
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.isEcomSignupRequiredToUseLoyaltyPoints}
              onCheckedChange={(c) => patch({ isEcomSignupRequiredToUseLoyaltyPoints: !!c })}
            />
            Require e-commerce signup
          </label>
        </div>
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
