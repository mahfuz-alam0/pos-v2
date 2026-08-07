"use client";

// Fork of manage-inventories/edit/[id]/GeneralPricingType.tsx for the "Assign
// Product to Package" drawer: identical, except tiers start empty (only
// added when "Add Tier" is clicked) instead of pre-seeding one blank tier.
// Kept separate so the real Manage Inventories edit page is unaffected.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { updateInventoryPricing } from "@/services/inventories/updateInventoryPricing";
import { updateInventoryPricingByCustomerGroup } from "@/services/inventories/updateInventoryPricingByCustomerGroup";
import { estimatePostTaxPrices } from "@/services/inventories/estimatePostTaxPrices";
import { fetchPricingTemplates } from "@/services/pricingTemplates";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function calculatePreviewPrice(tier, uomData) {
  const uom = uomData.find((u) => u.id === tier?.displayUoMId);
  if (!uom || uom.conversionRate <= 0 || tier.unitAmount <= 0 || tier.offAmount <= 0) return 0;
  return parseFloat((tier.offAmount * tier.unitAmount * uom.conversionRate).toFixed(2));
}

export default function DrawerGeneralPricingType({
  data,
  shopId,
  inventoryId,
  uomData,
  editMode = false,
  isCustomerGroupPricing = false,
  customerGroupId = null,
  targetUoMId,
  inventoryData,
  onSaveSuccess,
}) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isTieredPricingApplicable, setIsTieredPricingApplicable] = useState(true);
  const [tiers, setTiers] = useState([]);
  const [unitPerEach, setUnitPerEach] = useState(data?.unitPrice ?? 0);
  const [unitPreviewPrice, setUnitPreviewPrice] = useState(0);
  const [unitPricePostTax, setUnitPricePostTax] = useState(0);
  const purchaseAmount = 1;
  const uomConversionRate = data?.uomConversionRate || 1;

  const [useExistingPricing, setUseExistingPricing] = useState(false);
  const [pricingTemplates, setPricingTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);

  useEffect(() => {
    if (!data) return;
    setIsTieredPricingApplicable(!!data.isTieredPricingApplicable);
    setUnitPerEach(data.unitPrice ?? 0);

    const previewPrice = parseFloat(((data.unitPrice ?? 0) * purchaseAmount * uomConversionRate).toFixed(2));
    setUnitPreviewPrice(previewPrice);

    if (uomData?.length && data.tiers?.length) {
      const updatedTiers = data.tiers.map((tier) => {
        const currentUoM = uomData.find((u) => u.id === tier.displayUoMId);
        if (!currentUoM) {
          return { unitAmount: 0, offAmount: 0, displayUoMId: null, displayUoM: null, postTaxPrice: 0, previewPrice: 0 };
        }
        const unitAmount = tier.buyMinimum / currentUoM.conversionRate;
        const offAmount = tier.offAmount;
        const preview = parseFloat((offAmount * unitAmount * currentUoM.conversionRate).toFixed(2));
        return { unitAmount, offAmount, displayUoMId: currentUoM.id, displayUoM: currentUoM, postTaxPrice: 0, previewPrice: preview };
      });
      setTiers(updatedTiers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, uomData]);

  useEffect(() => {
    if (!inventoryData?.productId || !editMode) return;
    if (unitPreviewPrice > 0) calculateUnitPriceTax(unitPreviewPrice);
    calculateAllTierTaxes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryData, editMode, unitPreviewPrice, tiers.length]);

  useEffect(() => {
    if (!shopId || !targetUoMId) return;
    setTemplatesLoading(true);
    fetchPricingTemplates(shopId, targetUoMId)
      .then((res) => setPricingTemplates(res?.data?.data?.templates ?? []))
      .catch((err) => toast.error(err?.message || "Failed to load pricing templates"))
      .finally(() => setTemplatesLoading(false));
  }, [shopId, targetUoMId]);

  const calculateUnitPriceTax = async (previewPrice) => {
    if (!previewPrice || previewPrice <= 0) {
      setUnitPricePostTax(0);
      return;
    }
    try {
      const res = await estimatePostTaxPrices({
        shopId,
        productId: inventoryData.productId,
        preTaxPrices: [previewPrice],
      });
      const taxes = res?.data?.data?.taxesApplicable;
      if (taxes?.length > 0) setUnitPricePostTax(taxes[0] + previewPrice);
    } catch {
      toast.error("Failed to calculate post-tax price");
    }
  };

  const calculateAllTierTaxes = async () => {
    if (!tiers.length || !inventoryData?.productId) return;
    const validTiers = tiers.filter(
      (t) => t.displayUoM && t.unitAmount > 0 && t.offAmount > 0 && t.displayUoM.conversionRate > 0
    );
    if (!validTiers.length) return;

    try {
      const preTaxPrices = validTiers.map((t) =>
        parseFloat((t.offAmount * t.unitAmount * t.displayUoM.conversionRate).toFixed(2))
      );
      const res = await estimatePostTaxPrices({ shopId, productId: inventoryData.productId, preTaxPrices });
      const taxes = res?.data?.data?.taxesApplicable;
      if (taxes?.length > 0) {
        const validIndices = tiers.reduce((acc, t, i) => {
          if (t.displayUoM && t.unitAmount > 0 && t.offAmount > 0 && t.displayUoM.conversionRate > 0) acc.push(i);
          return acc;
        }, []);
        setTiers((prev) => {
          const next = [...prev];
          validIndices.forEach((origIdx, validIdx) => {
            if (validIdx < taxes.length) next[origIdx] = { ...next[origIdx], postTaxPrice: taxes[validIdx] };
          });
          return next;
        });
      }
    } catch {
      // best-effort tax preview; ignore
    }
  };

  const calculateTierTax = async (previewPrice, index) => {
    if (!previewPrice || previewPrice <= 0 || !inventoryData?.productId) return;
    try {
      const res = await estimatePostTaxPrices({ shopId, productId: inventoryData.productId, preTaxPrices: [previewPrice] });
      const taxes = res?.data?.data?.taxesApplicable;
      if (taxes?.length > 0) {
        setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, postTaxPrice: taxes[0] } : t)));
      }
    } catch {
      toast.error("Failed to calculate post-tax price");
    }
  };

  const handleUnitPerEachChange = (value) => {
    const perEach = Number(value) || 0;
    setUnitPerEach(perEach);
    const previewPrice = parseFloat((perEach * purchaseAmount * uomConversionRate).toFixed(2));
    setUnitPreviewPrice(previewPrice);
    calculateUnitPriceTax(previewPrice);
  };

  const handleUnitPreviewPriceChange = (value) => {
    const newPreview = Number(value) || 0;
    setUnitPreviewPrice(newPreview);
    if (purchaseAmount > 0) {
      setUnitPerEach(parseFloat((newPreview / (purchaseAmount * uomConversionRate)).toFixed(2)));
    }
    calculateUnitPriceTax(newPreview);
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        unitAmount: 0,
        offAmount: 0,
        displayUoMId: uomData.length ? uomData[0].id : null,
        displayUoM: uomData.length ? uomData[0] : null,
        postTaxPrice: 0,
        previewPrice: 0,
      },
    ]);
  };

  const removeTier = (index) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUomChange = (value, index) => {
    setTiers((prev) => {
      const next = prev.map((tier, i) => {
        if (i !== index) return tier;
        const selectedUoM = uomData.find((u) => u.id === value);
        const updated = { ...tier, displayUoMId: value, displayUoM: selectedUoM };
        updated.previewPrice = calculatePreviewPrice(updated, uomData);
        return updated;
      });
      return next;
    });
  };

  const handleTierUnitAmountChange = (value, index) => {
    setTiers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], unitAmount: Number(value) || 0 };
      next[index].previewPrice = calculatePreviewPrice(next[index], uomData);
      if (next[index].previewPrice > 0) calculateTierTax(next[index].previewPrice, index);
      return next;
    });
  };

  const handleTierOffAmountChange = (value, index) => {
    setTiers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], offAmount: Number(value) || 0 };
      next[index].previewPrice = calculatePreviewPrice(next[index], uomData);
      if (next[index].previewPrice > 0) calculateTierTax(next[index].previewPrice, index);
      return next;
    });
  };

  const handlePreviewPriceChange = (value, index) => {
    setTiers((prev) => {
      const next = [...prev];
      const tier = next[index];
      const previewValue = Number(value) || 0;
      if (tier.unitAmount <= 0) {
        next[index] = { ...tier, offAmount: 0, previewPrice: 0, postTaxPrice: 0 };
        return next;
      }
      const conversionRate = tier.displayUoM?.conversionRate || 1;
      const offAmount = previewValue / (conversionRate * tier.unitAmount);
      next[index] = { ...tier, offAmount, previewPrice: previewValue, postTaxPrice: 0 };
      if (previewValue > 0) calculateTierTax(previewValue, index);
      return next;
    });
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateData(pricingTemplates.find((t) => t.id === templateId) ?? null);
  };

  const handleSubmit = async () => {
    if (!useExistingPricing) {
      const isValid = tiers.every((t) => t.displayUoM && t.displayUoMId && t.offAmount && t.unitAmount);
      if (!isValid) {
        toast.error("Please fill up all fields in your tier pricing list");
        return;
      }
    }

    setSubmitLoading(true);
    const body = {
      shopId,
      inventoryId,
      unitPrice: useExistingPricing && selectedTemplateData ? selectedTemplateData.pricingInfo?.unitPrice : unitPerEach,
      isTieredPricingApplicable: !useExistingPricing,
      ...(isCustomerGroupPricing && { groupId: customerGroupId }),
      tieredPricingDetails: {
        measurementType: useExistingPricing ? "AMOUNT" : "QUANTITY",
        tiers: useExistingPricing
          ? []
          : tiers.map((t) => ({
              offType: "NEW_UNIT_PRICE",
              targetUoMId,
              displayUoMId: t.displayUoMId,
              buyMinimum: t.displayUoM.conversionRate * t.unitAmount,
              offAmount: t.offAmount,
            })),
      },
      pricingTemplateId: useExistingPricing ? selectedTemplateId ?? null : null,
    };

    try {
      if (isCustomerGroupPricing) {
        await updateInventoryPricingByCustomerGroup(body);
      } else {
        await updateInventoryPricing(body);
      }
      toast.success("Inventory pricing updated successfully");
      onSaveSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Failed to update inventory pricing");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!isCustomerGroupPricing && inventoryData?.pricingTemplate && !editMode && (
        <div className="w-fit text-sm text-primary">Template: {inventoryData.pricingTemplate.name}</div>
      )}

      {editMode ? (
        <>
          {!useExistingPricing && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground">Purchase Amount</Label>
                    <div className="flex items-center gap-2">
                      <Input value={1} disabled className="h-11 w-full" />
                      <span className="text-sm text-muted-foreground">
                        {uomData.find((u) => u.id === targetUoMId)?.shortForm}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground">Per {uomData.find((u) => u.id === targetUoMId)?.name || "Unit"}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={unitPerEach}
                      onChange={(e) => handleUnitPerEachChange(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-muted-foreground">Total Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={unitPreviewPrice}
                      onChange={(e) => handleUnitPreviewPriceChange(e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Pre Tax: ${(unitPreviewPrice || 0).toFixed(2)}</span>
                  <span>Post Tax: ${(unitPricePostTax || unitPreviewPrice || 0).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          {!inventoryData?.pricingTemplate && (
            <p><span className="font-medium">Unit Price: </span>{data?.unitPrice}</p>
          )}
          <p><span className="font-medium">Tiered Pricing Applicable: </span>{isTieredPricingApplicable ? "Yes" : "No"}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {tiers.map((tier, index) => (
          <Card key={index}>
            <CardContent className="relative flex flex-col gap-2">
              {editMode && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => removeTier(index)}
                >
                  <Trash2 className="size-4" /> Delete
                </Button>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Minimum Purchase Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      disabled={!editMode}
                      value={tier.unitAmount}
                      onChange={(e) => handleTierUnitAmountChange(e.target.value, index)}
                      className="h-11"
                    />
                    <Select
                      items={uomData.map((u) => ({ value: u.id, label: u.shortForm }))}
                      value={tier.displayUoMId ?? ""}
                      onValueChange={(v) => handleUomChange(v, index)}
                      disabled={!editMode}
                    >
                      <SelectTrigger className="h-11! w-28">
                        <SelectValue placeholder="UoM" />
                      </SelectTrigger>
                      <SelectContent>
                        {uomData.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.shortForm}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Per {tier.displayUoM ? tier.displayUoM.name : "Unit"}</Label>
                  <Input
                    type="number"
                    step={0.1}
                    disabled={!editMode}
                    value={tier.offAmount}
                    onChange={(e) => handleTierOffAmountChange(e.target.value, index)}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground">Total Price</Label>
                  <Input
                    type="number"
                    step={0.1}
                    disabled={!editMode}
                    value={tier.previewPrice ?? calculatePreviewPrice(tier, uomData)}
                    onChange={(e) => handlePreviewPriceChange(e.target.value, index)}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="flex gap-4 px-1 text-sm text-muted-foreground">
                <span>Pre Tax: ${(tier.previewPrice ?? calculatePreviewPrice(tier, uomData)).toFixed(2)}</span>
                <span>Post Tax: ${(tier.postTaxPrice || tier.previewPrice || 0).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {editMode && !useExistingPricing && (
          <Button onClick={addTier} className="h-10! w-fit px-4 text-sm!">Add Tier</Button>
        )}
      </div>

      {editMode && (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Checkbox checked={useExistingPricing} onCheckedChange={(c) => setUseExistingPricing(!!c)} />
              Apply Pricing Template
            </label>
            {useExistingPricing && (
              <Select
                items={pricingTemplates.map((t) => ({ value: t.id, label: `${t.name} (${t.sellableUoMShortForm})` }))}
                value={selectedTemplateId ?? ""}
                onValueChange={handleTemplateSelect}
                disabled={templatesLoading}
              >
                <SelectTrigger className="h-11! w-full max-w-sm">
                  <SelectValue placeholder="Select pricing template" />
                </SelectTrigger>
                <SelectContent>
                  {pricingTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.sellableUoMShortForm})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {useExistingPricing && selectedTemplateData && (
              <div className="rounded-lg border border-border">
                <div className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground">Template Details</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Template Name:</p>
                    <Badge variant="secondary" className="mt-1 text-emerald-600" style={{ backgroundColor: "#F5FCED" }}>
                      {selectedTemplateData.name}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">UoM:</p>
                    <Badge variant="secondary" className="mt-1 text-sky-600" style={{ backgroundColor: "#E6F7FF" }}>
                      {selectedTemplateData.sellableUoMShortForm}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Description:</p>
                    <p className="mt-1">{selectedTemplateData.description || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tiered Pricing:</p>
                    <Badge
                      variant="secondary"
                      className="mt-1 text-emerald-600"
                      style={{ backgroundColor: "#F5FCED" }}
                    >
                      {selectedTemplateData.pricingInfo?.isTieredPricingApplicable ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unit Price:</p>
                    <p className="mt-1 text-base font-semibold">
                      ${Number(selectedTemplateData.pricingInfo?.unitPrice ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mx-4 mb-4 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm">
                  <span className="font-semibold text-primary">Note: </span>
                  <span className="text-muted-foreground">
                    This pricing template will be applied to the imported package inventory. The template&apos;s pricing
                    configuration will override manual pricing inputs.
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {editMode && (
        <div className="flex justify-end">
          <Button className="h-10! px-4 text-sm!" onClick={handleSubmit} disabled={submitLoading}>
            {submitLoading ? "Saving..." : "Save Pricing Details"}
          </Button>
        </div>
      )}

    </div>
  );
}
