"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, Info, Loader2, Tag, X } from "lucide-react";

import {
  createPricingTemplate,
  fetchSinglePricingTemplate,
  updatePricingTemplate,
} from "@/services/pricingTemplates";
import { fetchUomList } from "@/services/uom/list";
import { fetchAssociatedUoms } from "@/services/uom/listAssociated";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, ShopMultiSelect } from "@/components/admin/form-fields";

import TierPricingEditor, { type PricingData } from "./TierPricingEditor";

function SectionHeading({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description && <p className="text-xs leading-tight text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

interface Uom {
  id: string;
  name: string;
  shortForm: string;
  conversionRate: number;
  applicationType: string;
}

const EMPTY_PRICING: PricingData = {
  unitPrice: 0,
  isTieredPricingApplicable: false,
  tieredPricingMeasurementType: "QUANTITY",
  tiers: [],
  uomConversionRate: 1,
};

export default function PricingTemplateDrawer({
  open,
  templateId,
  onClose,
  onSaved,
}: {
  open: boolean;
  templateId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditMode = !!templateId;

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uomData, setUomData] = useState<Uom[]>([]);
  const [associatedUomData, setAssociatedUomData] = useState<Uom[]>([]);
  const [shopIds, setShopIds] = useState<(string | number)[]>([]);
  const [selectedUoM, setSelectedUoM] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [templateData, setTemplateData] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setShopIds([]);
    setSelectedUoM(null);
    setPricingData(null);
    setTemplateData(null);
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const uomRes = await fetchUomList();
      const uoms: Uom[] = uomRes?.data?.data?.uoms ?? [];
      setUomData(uoms);

      if (templateId) {
        const res = await fetchSinglePricingTemplate(templateId);
        const template = res?.data?.data?.template;
        if (template) {
          setTemplateData(template);
          setName(template.name);
          setDescription(template.description || "");
          setShopIds(template.associatedShops?.map((s: any) => s.id) ?? []);
          setSelectedUoM(template.sellableUoMId);
          setPricingData(pricingFromTemplate(template));
          fetchAssociatedUomData(template.sellableUoMId);
        }
      } else {
        const eachUoM =
          uoms.find((u) => u.applicationType === "SELLABLE_STOCK" && (u.shortForm.toLowerCase() === "ea" || u.name.toLowerCase() === "each")) ??
          uoms.find((u) => u.applicationType === "SELLABLE_STOCK");
        if (eachUoM) {
          setSelectedUoM(eachUoM.id);
          fetchAssociatedUomData(eachUoM.id);
        }
        setPricingData(EMPTY_PRICING);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const pricingFromTemplate = (template: any): PricingData => {
    const info = template.pricingInfo || {};
    return {
      unitPrice: info.unitPrice || 0,
      isTieredPricingApplicable: info.isTieredPricingApplicable || false,
      tieredPricingMeasurementType: info.tieredPricingMeasurementType || "QUANTITY",
      tiers: info.tiers || [],
      uomConversionRate: 1,
    };
  };

  const fetchAssociatedUomData = async (uomId: string) => {
    try {
      const res = await fetchAssociatedUoms(uomId, { page: 1, limit: 1 });
      setAssociatedUomData(res?.data?.data?.uoms ?? []);
    } catch {
      // non-critical
    }
  };

  const handleUoMChange = (value: string) => {
    setSelectedUoM(value);
    setPricingData(EMPTY_PRICING);
    fetchAssociatedUomData(value);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter template name");
      return;
    }
    if (!selectedUoM) {
      toast.error("Please select UoM");
      return;
    }
    if (shopIds.length === 0) {
      toast.error("Please select at least one shop");
      return;
    }

    setSubmitLoading(true);
    try {
      const tiersData = (pricingData?.tiers ?? [])
        .filter((t) => t.displayUoMId && t.buyMinimum > 0 && t.offAmount > 0)
        .map((t) => ({
          displayUoMConversionRateUsed: 1,
          offType: "NEW_UNIT_PRICE",
          targetUoMId: selectedUoM,
          displayUoMId: t.displayUoMId,
          buyMinimum: Number(t.buyMinimum) || 0,
          offAmount: Number(t.offAmount) || 0,
        }));

      const body: Record<string, unknown> = {
        name,
        description: description || null,
        sellableUoMId: selectedUoM,
        unitPrice: Number(pricingData?.unitPrice) || 1,
        isTieredPricingApplicable: pricingData?.isTieredPricingApplicable || false,
        tieredPricingDetails: {
          measurementType: pricingData?.tieredPricingMeasurementType || "QUANTITY",
          tiers: tiersData,
        },
        associatedShopIds: shopIds,
      };

      if (isEditMode) {
        body.id = templateData.id;
        await updatePricingTemplate(body);
        toast.success("Template updated successfully");
      } else {
        await createPricingTemplate(body);
        toast.success("Template created successfully");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={submitLoading ? undefined : onClose} side="right" size={760}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Tag className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{isEditMode ? "Edit Pricing Template" : "Add Pricing Template"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {isEditMode ? "Update template details and pricing" : "Define a reusable pricing structure"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={submitLoading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading template data...
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10">
                <SectionHeading icon={<Info className="size-3.5" />} title="Template Information" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Template Name" required>
                    <Input placeholder="Enter template name" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>

                  <Field label="Unit of Measurement" required>
                    <Select
                      items={uomData
                        .filter((u) => u.applicationType === "SELLABLE_STOCK")
                        .map((u) => ({ value: u.id, label: `${u.name} (${u.shortForm})` }))}
                      value={selectedUoM ?? undefined}
                      onValueChange={(v) => handleUoMChange(v as string)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select UoM" />
                      </SelectTrigger>
                      <SelectContent>
                        {uomData
                          .filter((u) => u.applicationType === "SELLABLE_STOCK")
                          .map((uom) => (
                            <SelectItem key={uom.id} value={uom.id}>
                              {uom.name} ({uom.shortForm})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Associated Shops" required>
                  <ShopMultiSelect value={shopIds} onChange={setShopIds} />
                </Field>

                <Field label="Description">
                  <Textarea placeholder="Enter description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </Field>
              </div>

              <div className="flex flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10">
                <SectionHeading
                  icon={<DollarSign className="size-3.5" />}
                  title="Pricing Configuration"
                  description="Set a base unit price, then optionally add bulk pricing tiers"
                />
                {selectedUoM && pricingData && associatedUomData.length > 0 ? (
                  <TierPricingEditor data={pricingData} targetUoMId={selectedUoM} uomData={associatedUomData} onPricingChange={setPricingData} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {isEditMode ? "Loading pricing configuration..." : "Please select a Unit of Measurement to configure pricing"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={submitLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitLoading || loading || !selectedUoM}>
            {submitLoading ? "Saving..." : isEditMode ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
