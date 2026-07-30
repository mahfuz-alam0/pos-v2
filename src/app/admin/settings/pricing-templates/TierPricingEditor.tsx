"use client";

import { useEffect, useState } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Uom {
  id: string;
  name: string;
  shortForm: string;
  conversionRate: number;
}

interface Tier {
  unitAmount: number;
  offAmount: number;
  displayUoMId: string | null;
  displayUoM: Uom | null;
}

export interface PricingData {
  unitPrice: number;
  isTieredPricingApplicable: boolean;
  tieredPricingMeasurementType: string;
  tiers: { buyMinimum: number; offAmount: number; displayUoMId: string }[];
  uomConversionRate: number;
}

function calculatePreviewPrice(tier: Tier) {
  if (!tier.displayUoM || tier.displayUoM.conversionRate <= 0 || tier.unitAmount <= 0 || tier.offAmount <= 0) return 0;
  return parseFloat((tier.offAmount * tier.unitAmount * tier.displayUoM.conversionRate).toFixed(2));
}

export default function TierPricingEditor({
  data,
  targetUoMId,
  uomData,
  onPricingChange,
}: {
  data: PricingData | null;
  targetUoMId: string;
  uomData: Uom[];
  onPricingChange: (data: PricingData) => void;
}) {
  const [unitPerEach, setUnitPerEach] = useState(data?.unitPrice ?? 0);
  const [unitPreviewPrice, setUnitPreviewPrice] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const uomConversionRate = data?.uomConversionRate || 1;

  useEffect(() => {
    if (!data) return;
    setUnitPerEach(data.unitPrice || 0);
    setUnitPreviewPrice(parseFloat(((data.unitPrice || 0) * uomConversionRate).toFixed(2)));

    if (uomData.length && data.tiers?.length) {
      setTiers(
        data.tiers.map((tier) => {
          const uom = uomData.find((u) => u.id === tier.displayUoMId);
          if (!uom) return { unitAmount: 0, offAmount: 0, displayUoMId: null, displayUoM: null };
          return {
            unitAmount: tier.buyMinimum / uom.conversionRate,
            offAmount: tier.offAmount,
            displayUoMId: uom.id,
            displayUoM: uom,
          };
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, uomData]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onPricingChange({
        unitPrice: unitPerEach,
        isTieredPricingApplicable: tiers.length > 0,
        tieredPricingMeasurementType: "QUANTITY",
        uomConversionRate,
        tiers: tiers
          .filter((t) => t.displayUoMId && t.unitAmount > 0 && t.offAmount > 0)
          .map((t) => ({
            displayUoMId: t.displayUoMId!,
            buyMinimum: (t.displayUoM?.conversionRate || 1) * t.unitAmount,
            offAmount: t.offAmount,
          })),
      });
    }, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitPerEach, tiers]);

  const handleUnitPerEachChange = (value: string) => {
    const perEach = Number(value) || 0;
    setUnitPerEach(perEach);
    setUnitPreviewPrice(parseFloat((perEach * uomConversionRate).toFixed(2)));
  };

  const handleUnitPreviewPriceChange = (value: string) => {
    const preview = Number(value) || 0;
    setUnitPreviewPrice(preview);
    setUnitPerEach(parseFloat((preview / uomConversionRate).toFixed(2)));
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      { unitAmount: 0, offAmount: 0, displayUoMId: uomData.length ? uomData[0].id : null, displayUoM: uomData.length ? uomData[0] : null },
    ]);
  };

  const removeTier = (index: number) => setTiers((prev) => prev.filter((_, i) => i !== index));

  const updateTier = (index: number, updates: Partial<Tier>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };

  const handleUomChange = (value: string, index: number) => {
    updateTier(index, { displayUoMId: value, displayUoM: uomData.find((u) => u.id === value) ?? null });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Purchase Amount</Label>
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm">
              <span>1</span>
              <span className="text-muted-foreground">{uomData.find((u) => u.id === targetUoMId)?.shortForm}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Unit Price</Label>
            <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background pl-2.5 has-[input:focus-visible]:border-ring has-[input:focus-visible]:shadow-[0_0_0_1px_var(--ring)]">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={0.1}
                className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:shadow-none"
                value={unitPerEach}
                onChange={(e) => handleUnitPerEachChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Total Price</Label>
            <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background pl-2.5 has-[input:focus-visible]:border-ring has-[input:focus-visible]:shadow-[0_0_0_1px_var(--ring)]">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={0.1}
                className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:shadow-none"
                value={unitPreviewPrice}
                onChange={(e) => handleUnitPreviewPriceChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {tiers.length > 0 && (
        <div className="flex flex-col gap-3">
          {tiers.map((tier, index) => (
            <div key={index} className="rounded-xl p-4 ring-1 ring-foreground/10">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Layers className="size-3.5" />
                  Tier {index + 1}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => removeTier(index)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Minimum Purchase Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      className="min-w-0 flex-1"
                      value={tier.unitAmount}
                      onChange={(e) => updateTier(index, { unitAmount: Number(e.target.value) || 0 })}
                    />
                    <Select
                      items={uomData.map((u) => ({ value: u.id, label: `${u.name} (${u.shortForm})` }))}
                      value={tier.displayUoMId ?? undefined}
                      onValueChange={(v) => handleUomChange(v as string, index)}
                    >
                      <SelectTrigger className="w-28 shrink-0">
                        <SelectValue placeholder="UoM" />
                      </SelectTrigger>
                      <SelectContent>
                        {uomData.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.shortForm})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Unit Price</Label>
                  <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background pl-2.5 has-[input:focus-visible]:border-ring has-[input:focus-visible]:shadow-[0_0_0_1px_var(--ring)]">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step={0.1}
                      className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:shadow-none"
                      value={tier.offAmount}
                      onChange={(e) => updateTier(index, { offAmount: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Total Price</Label>
                  <div className="flex h-8 items-center gap-1.5 rounded-lg bg-muted px-2.5 text-sm text-muted-foreground">
                    <span>$</span>
                    <span className="font-medium text-foreground">{calculatePreviewPrice(tier).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-fit border-dashed" onClick={addTier}>
        <Plus className="size-3.5" /> Add Tier
      </Button>
    </div>
  );
}
