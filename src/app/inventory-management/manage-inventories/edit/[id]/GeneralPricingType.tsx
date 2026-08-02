"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";

import { updateInventoryPricing } from "@/services/inventories/updateInventoryPricing";
import { updateInventoryPricingByCustomerGroup } from "@/services/inventories/updateInventoryPricingByCustomerGroup";
import { estimatePostTaxPrices } from "@/services/inventories/estimatePostTaxPrices";
import { fetchPricingTemplates, fetchSinglePricingTemplate } from "@/services/pricingTemplates";

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
import Drawer from "@/components/ui/Drawer";

function calculatePreviewPrice(tier, uomData) {
  const uom = uomData.find((u) => u.id === tier?.displayUoMId);
  if (!uom || uom.conversionRate <= 0 || tier.unitAmount <= 0 || tier.offAmount <= 0) return 0;
  return parseFloat((tier.offAmount * tier.unitAmount * uom.conversionRate).toFixed(2));
}

export default function GeneralPricingType({
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
  const [tiers, setTiers] = useState([
    { unitAmount: 0, offAmount: 0, displayUoMId: targetUoMId, displayUoM: null, postTaxPrice: 0, previewPrice: 0 },
  ]);
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
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);

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

  const openTemplateDetails = async (template) => {
    try {
      const res = await fetchSinglePricingTemplate(template.id);
      setSelectedTemplateData(res?.data?.data?.template ?? template);
    } catch {
      setSelectedTemplateData(template);
    }
    setShowTemplateDetails(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {!isCustomerGroupPricing && inventoryData?.pricingTemplate && !editMode && (
        <button
          type="button"
          className="w-fit text-sm text-primary hover:underline"
          onClick={() => openTemplateDetails(inventoryData.pricingTemplate)}
        >
          Template: {inventoryData.pricingTemplate.name}
        </button>
      )}

      {editMode ? (
        <>
          {!useExistingPricing && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Purchase Amount</Label>
                    <div className="flex items-center gap-2">
                      <Input value={1} disabled className="w-full" />
                      <span className="text-sm text-muted-foreground">
                        {uomData.find((u) => u.id === targetUoMId)?.shortForm}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Per {uomData.find((u) => u.id === targetUoMId)?.name || "Unit"}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={unitPerEach}
                      onChange={(e) => handleUnitPerEachChange(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Total Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={unitPreviewPrice}
                      onChange={(e) => handleUnitPreviewPriceChange(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
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
                  <Label>Minimum Purchase Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      disabled={!editMode}
                      value={tier.unitAmount}
                      onChange={(e) => handleTierUnitAmountChange(e.target.value, index)}
                    />
                    <Select
                      items={uomData.map((u) => ({ value: u.id, label: u.shortForm }))}
                      value={tier.displayUoMId ?? ""}
                      onValueChange={(v) => handleUomChange(v, index)}
                      disabled={!editMode}
                    >
                      <SelectTrigger className="w-28">
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
                  <Label>Per {tier.displayUoM ? tier.displayUoM.name : "Unit"}</Label>
                  <Input
                    type="number"
                    step={0.1}
                    disabled={!editMode}
                    value={tier.offAmount}
                    onChange={(e) => handleTierOffAmountChange(e.target.value, index)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Total Price</Label>
                  <Input
                    type="number"
                    step={0.1}
                    disabled={!editMode}
                    value={tier.previewPrice ?? calculatePreviewPrice(tier, uomData)}
                    onChange={(e) => handlePreviewPriceChange(e.target.value, index)}
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
          <Button onClick={addTier} className="w-fit">Add Tier</Button>
        )}
      </div>

      {editMode && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
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
                <SelectTrigger className="w-full max-w-sm">
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
              <div className="flex flex-col gap-2 rounded border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge>{selectedTemplateData.name}</Badge>
                  <Badge variant="secondary">{selectedTemplateData.sellableUoMShortForm}</Badge>
                </div>
                <p>Unit Price: ${Number(selectedTemplateData.pricingInfo?.unitPrice ?? 0).toFixed(2)}</p>
                <button
                  type="button"
                  className="w-fit text-primary hover:underline"
                  onClick={() => setShowTemplateDetails(true)}
                >
                  View full details
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {editMode && (
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitLoading}>
            {submitLoading ? "Saving..." : "Save Pricing Details"}
          </Button>
        </div>
      )}

      <Drawer open={showTemplateDetails} onClose={() => setShowTemplateDetails(false)} side="right" size={420}>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Pricing Template Details</h3>
            <button onClick={() => setShowTemplateDetails(false)}>
              <X className="size-4" />
            </button>
          </div>
          {selectedTemplateData && (
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <p className="font-medium">Template Name</p>
                <Badge>{selectedTemplateData.name}</Badge>
              </div>
              {selectedTemplateData.description && (
                <div>
                  <p className="font-medium">Description</p>
                  <p>{selectedTemplateData.description}</p>
                </div>
              )}
              <div>
                <p className="font-medium">Unit Price</p>
                <p>${Number(selectedTemplateData.pricingInfo?.unitPrice ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="font-medium">Tiered Pricing</p>
                <Badge variant={selectedTemplateData.pricingInfo?.isTieredPricingApplicable ? "default" : "secondary"}>
                  {selectedTemplateData.pricingInfo?.isTieredPricingApplicable ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {selectedTemplateData.pricingInfo?.tiers?.length > 0 && (
                <div>
                  <p className="mb-2 font-medium">Pricing Tiers</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1 text-left">Min Qty</th>
                        <th className="py-1 text-left">Price</th>
                        <th className="py-1 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTemplateData.pricingInfo.tiers.map((tier, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-1">{tier.buyMinimum}</td>
                          <td className="py-1">${Number(tier.offAmount).toFixed(2)}</td>
                          <td className="py-1">${Number(tier.buyMinimum * tier.offAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
