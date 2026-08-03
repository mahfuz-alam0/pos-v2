"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, X } from "lucide-react";

import { getSingleCustomerType } from "@/services/customerTypes/getSingle";
import { getShopRewardByType } from "@/services/customerTypes/getShopReward";
import { updateShopReward } from "@/services/customerTypes/updateShopReward";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

interface RewardSettingsDrawerProps {
  open: boolean;
  typeId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RewardSettingsDrawer({ open, typeId, onClose, onSaved }: RewardSettingsDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [typeName, setTypeName] = useState("");
  const [status, setStatus] = useState(false);
  const [exemptTaxes, setExemptTaxes] = useState(false);
  const [entireCart, setEntireCart] = useState(false);
  const [amount, setAmount] = useState("");
  const [chargeType, setChargeType] = useState<"PERCENTAGE" | "AMOUNT" | "">("");

  useEffect(() => {
    if (!open || !typeId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [typeRes, rewardRes] = await Promise.all([getSingleCustomerType(typeId), getShopRewardByType(typeId)]);
        setTypeName(typeRes?.data?.name ?? "");

        const rule = rewardRes?.data;
        setStatus(rule?.isEnabled ?? false);
        setExemptTaxes(rule?.shouldExemptTaxes ?? false);
        setEntireCart(!!rule?.offerOnEntireCart);
        setAmount(rule?.offerOnEntireCart?.amount != null ? String(rule.offerOnEntireCart.amount) : "");
        setChargeType(rule?.offerOnEntireCart?.chargeType ?? "");
      } catch (err: any) {
        toast.error(err?.message || "Failed to load reward settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, typeId]);

  const handleSave = async () => {
    if (entireCart && (!amount.trim() || !chargeType)) {
      toast.error("Please enter amount and measurement type");
      return;
    }
    setSaving(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      const body: Record<string, any> = {
        typeId,
        isEnabled: status,
        shopId,
        shouldExemptTaxes: exemptTaxes,
      };
      if (entireCart) {
        body.offerOnEntireCart = { name: typeName, amount: Number(amount), chargeType };
      }
      await updateShopReward(body);
      toast.success("Reward rule updated successfully");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Reward Settings</div>
            <div className="text-xs leading-tight text-muted-foreground">Manage reward policy for {typeName || "this type"}</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={exemptTaxes} onCheckedChange={(checked) => setExemptTaxes(!!checked)} />
                Tax Exempt
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={entireCart} onCheckedChange={(checked) => setEntireCart(!!checked)} />
                Apply discounts on entire order
              </label>

              {entireCart && (
                <div className="flex flex-col gap-4">
                  <Field label="Amount" required>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </Field>
                  <Field label="Measurement Type" required>
                    <Select
                      value={chargeType}
                      onValueChange={(val) => setChargeType(val as "PERCENTAGE" | "AMOUNT")}
                      items={[
                        { value: "PERCENTAGE", label: "Percentage (%)" },
                        { value: "AMOUNT", label: "Amount ($)" },
                      ]}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        <SelectItem value="AMOUNT">Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Status</span>
                <Switch checked={status} onCheckedChange={setStatus} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
