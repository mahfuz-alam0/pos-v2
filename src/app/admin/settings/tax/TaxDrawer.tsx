"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, Plus, Trash2, X } from "lucide-react";

import { fetchClassificationsList } from "@/services/classifications/list";
import { fetchCustomerGroups } from "@/services/customerGroups/list";
import { getSingleTax } from "@/services/tax/getSingleTax";
import { createTax } from "@/services/tax/createTax";
import { updateTax } from "@/services/tax/updateTax";
import { setCustomerGroupTaxes as setCustomerGroupTaxesAPI } from "@/services/tax/setCustomerGroupTaxes";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

import type { Classification, CustomerGroup, CustomerGroupTaxEntry, RegionalTaxGroup, TaxCharge } from "./types";

const TAX_TYPES = ["EXCISE", "CITY", "COUNTY", "MUNICIPAL", "SALES"];
const TAX_TYPE_MAP: Record<string, string> = {
  ExciseTax: "EXCISE",
  CityTax: "CITY",
  CountyTax: "COUNTY",
  MunicipalTax: "MUNICIPAL",
  SalesTax: "SALES",
};
const normalizeTaxType = (taxType: string) => TAX_TYPE_MAP[taxType] ?? taxType;

const genId = () => Math.random().toString(36).slice(2, 12);

const emptyCharge = (): TaxCharge => ({
  taxName: "",
  taxType: "",
  taxRate: "",
  externalId: genId(),
  compoundTaxReferences: [],
  isCompound: false,
  shouldBeForced: false,
});

const emptyRegionalGroup = (): RegionalTaxGroup => {
  const externalId = genId();
  return {
    state: "CALIFORNIA",
    zipCodeMode: "INCLUDE",
    zipCodes: [],
    taxes: [{ ...emptyCharge(), externalId }],
    taxRefs: [{ value: externalId, label: "" }],
  };
};

function ChargeRow({
  charge,
  taxRefOptions,
  onChange,
  onRemove,
  removable,
}: {
  charge: TaxCharge;
  taxRefOptions: { value: string; label: string }[];
  onChange: (key: keyof TaxCharge, value: unknown) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const availableRefs = taxRefOptions.filter((r) => r.value !== charge.externalId);

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="Charge Name" required>
          <Input value={charge.taxName} onChange={(e) => onChange("taxName", e.target.value)} />
        </Field>
        <Field label="Tax Type">
          <Select value={charge.taxType} onValueChange={(v) => onChange("taxType", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Tax Type" />
            </SelectTrigger>
            <SelectContent>
              {TAX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tax Rate (%)" required>
          <Input type="number" value={charge.taxRate} onChange={(e) => onChange("taxRate", e.target.value)} />
        </Field>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={charge.isCompound} onCheckedChange={(v) => onChange("isCompound", !!v)} />
        Compound Tax
      </label>

      {charge.isCompound && (
        <Field label="Compound Tax References">
          <div className="flex flex-wrap gap-2">
            {availableRefs.length === 0 && (
              <span className="text-xs text-muted-foreground">No other charges to reference</span>
            )}
            {availableRefs.map((ref) => (
              <label key={ref.value} className="flex cursor-pointer items-center gap-1.5 text-xs">
                <Checkbox
                  checked={charge.compoundTaxReferences.includes(ref.value)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...charge.compoundTaxReferences, ref.value]
                      : charge.compoundTaxReferences.filter((v) => v !== ref.value);
                    onChange("compoundTaxReferences", next);
                  }}
                />
                {ref.label || "(unnamed)"}
              </label>
            ))}
          </div>
        </Field>
      )}

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span>Should Be Forced:</span>
          <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-input">
            <button
              type="button"
              onClick={() => onChange("shouldBeForced", true)}
              className={`px-2.5 py-0.5 text-xs ${charge.shouldBeForced ? "bg-primary text-primary-foreground" : ""}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange("shouldBeForced", false)}
              className={`px-2.5 py-0.5 text-xs ${!charge.shouldBeForced ? "bg-primary text-primary-foreground" : ""}`}
            >
              No
            </button>
          </div>
        </label>
        {removable && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function RegionalTaxGroupCard({
  group,
  index,
  onUpdate,
  onRemove,
  onAddCharge,
  onUpdateCharge,
  onRemoveCharge,
}: {
  group: RegionalTaxGroup;
  index: number;
  onUpdate: (key: keyof RegionalTaxGroup, value: unknown) => void;
  onRemove: () => void;
  onAddCharge: () => void;
  onUpdateCharge: (ci: number, key: keyof TaxCharge, value: unknown) => void;
  onRemoveCharge: (ci: number) => void;
}) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Regional Taxes Group {index + 1}</p>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="State">
          <Select value={group.state} onValueChange={(v) => onUpdate("state", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CALIFORNIA">California</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Zip Code Mode">
          <Select value={group.zipCodeMode} onValueChange={(v) => onUpdate("zipCodeMode", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCLUDE">Include</SelectItem>
              <SelectItem value="EXCLUDE">Exclude</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {(group.zipCodeMode === "INCLUDE" || group.zipCodeMode === "EXCLUDE") && (
          <Field label="Zip Codes (comma separated)">
            <Input
              value={group.zipCodes.join(", ")}
              onChange={(e) =>
                onUpdate(
                  "zipCodes",
                  e.target.value
                    .split(",")
                    .map((z) => z.trim())
                    .filter(Boolean)
                )
              }
            />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {group.taxes.map((charge, ci) => (
          <ChargeRow
            key={charge.externalId}
            charge={charge}
            taxRefOptions={group.taxRefs}
            onChange={(key, value) => onUpdateCharge(ci, key, value)}
            onRemove={() => onRemoveCharge(ci)}
            removable={group.taxes.length > 1}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={onAddCharge} className="w-fit">
          <Plus className="size-4" /> Add Charge
        </Button>
      </div>
    </Card>
  );
}

interface TaxDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  taxId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaxDrawer({ open, mode, taxId, onClose, onSaved }: TaxDrawerProps) {
  const id = mode === "edit" ? taxId : null;

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [cgSubmitLoading, setCgSubmitLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("global");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [classificationId, setClassificationId] = useState<string | number | null>(null);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [taxApplicationMethod, setTaxApplicationMethod] = useState<"true" | "false" | "discountNotConsidered">(
    "false"
  );
  const [isDefaultForMJ, setIsDefaultForMJ] = useState(false);
  const [isDefaultForNonMJ, setIsDefaultForNonMJ] = useState(false);

  const [chargesInput, setChargesInput] = useState<TaxCharge[]>([emptyCharge()]);
  const [regionalTaxes, setRegionalTaxes] = useState<RegionalTaxGroup[]>([]);
  const [chargesInputError, setChargesInputError] = useState(false);

  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [customerGroupTaxes, setCustomerGroupTaxes] = useState<Record<string, CustomerGroupTaxEntry>>({});

  const taxRefOptions = chargesInput.map((c) => ({ value: c.externalId, label: c.taxName }));

  useEffect(() => {
    if (!open) return;

    fetchClassificationsList({ page: 1, limit: 100 }).then((res) => setClassifications(res?.data ?? []));

    if (mode === "edit" && id) {
      populateTaxData(id);
    } else {
      resetForm();
      loadCustomerGroups([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, id]);

  function resetForm() {
    setActiveTab("global");
    setName("");
    setDescription("");
    setClassificationId(null);
    setTaxApplicationMethod("false");
    setIsDefaultForMJ(false);
    setIsDefaultForNonMJ(false);
    setChargesInput([emptyCharge()]);
    setRegionalTaxes([]);
    setChargesInputError(false);
  }

  async function loadCustomerGroups(cgSpecificTaxes: any[] = []) {
    try {
      const res = await fetchCustomerGroups({ limit: 100, page: 1 });
      const groups: CustomerGroup[] = res?.data?.data?.customerGroups ?? [];
      setCustomerGroups(groups);

      const cgMap = Object.fromEntries((cgSpecificTaxes ?? []).map((cg: any) => [cg.customerGroupId, cg]));

      setCustomerGroupTaxes(
        Object.fromEntries(
          groups.map((g) => {
            const saved = cgMap[g.id];
            if (saved) {
              return [
                g.id,
                {
                  enabled: saved.isEnabled ?? true,
                  taxes: (saved.rootTaxes ?? []).map((t: TaxCharge) => ({
                    ...t,
                    taxType: normalizeTaxType(t.taxType),
                    isCompound: (t.compoundTaxReferences ?? []).length > 0,
                  })),
                  regionalTaxes: (saved.regionalTaxes ?? []).map((r: any) => {
                    const externalIds = (r.taxes ?? []).map((t: TaxCharge) => t.externalId);
                    return {
                      state: r.zipCodePreference?.region ?? "CALIFORNIA",
                      zipCodeMode: r.zipCodePreference?.zipCodePreference ?? "INCLUDE",
                      zipCodes: r.zipCodePreference?.targetZipCodes ?? [],
                      taxes: (r.taxes ?? []).map((t: TaxCharge) => ({
                        ...t,
                        taxType: normalizeTaxType(t.taxType),
                        isCompound: (t.compoundTaxReferences ?? []).length > 0,
                      })),
                      taxRefs: externalIds.map((eid: string, i: number) => ({
                        value: eid,
                        label: r.taxes[i]?.taxName ?? "",
                      })),
                    };
                  }),
                },
              ];
            }
            return [g.id, { enabled: false, taxes: [], regionalTaxes: [] }];
          })
        )
      );
    } catch (e) {
      console.error("Failed to fetch customer groups", e);
    }
  }

  async function populateTaxData(taxId: string | number) {
    setLoading(true);
    try {
      const res = await getSingleTax(taxId);
      const taxData = res?.data;
      if (!taxData) {
        toast.error("Tax profile not found");
        return;
      }

      if (taxData.isIncludeButDiscountIsNotConsidered === true) {
        setTaxApplicationMethod("discountNotConsidered");
      } else if (taxData.isIncluded === true) {
        setTaxApplicationMethod("true");
      } else {
        setTaxApplicationMethod("false");
      }

      setName(taxData.name ?? "");
      setDescription(taxData.description ?? "");
      setClassificationId(taxData.classification?.id ?? null);
      setIsDefaultForMJ(taxData.isDefaultForMJ || false);
      setIsDefaultForNonMJ(taxData.isDefaultForNonMJ || false);

      const normalizedTaxes = (taxData.taxes ?? []).map((tax) => ({
        ...tax,
        taxType: normalizeTaxType(tax.taxType),
        isCompound: (tax.compoundTaxReferences ?? []).length > 0,
      }));
      setChargesInput(normalizedTaxes.length > 0 ? normalizedTaxes : [emptyCharge()]);

      setRegionalTaxes(
        taxData.globalRegionalTaxes && taxData.globalRegionalTaxes.length > 0
          ? taxData.globalRegionalTaxes.map((entry: any) => {
              const externalIds = (entry.taxes ?? []).map((t: TaxCharge) => t.externalId);
              return {
                state: entry.zipCodePreference?.region ?? "CALIFORNIA",
                zipCodeMode:
                  entry.zipCodePreference?.zipCodePreference === "ALL"
                    ? "INCLUDE"
                    : entry.zipCodePreference?.zipCodePreference ?? "INCLUDE",
                zipCodes: entry.zipCodePreference?.targetZipCodes ?? [],
                taxes: (entry.taxes ?? []).map((t: TaxCharge) => ({
                  ...t,
                  taxType: normalizeTaxType(t.taxType),
                  isCompound: (t.compoundTaxReferences ?? []).length > 0,
                })),
                taxRefs: externalIds.map((eid: string, i: number) => ({
                  value: eid,
                  label: entry.taxes[i]?.taxName ?? "",
                })),
              };
            })
          : []
      );

      await loadCustomerGroups(taxData.customerGroupSpecificTaxeS ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load tax profile");
    } finally {
      setLoading(false);
    }
  }

  const validateChargesInput = () => {
    const isError = chargesInput.some((c) => !c.taxName || !c.taxRate);
    setChargesInputError(isError);
    return !isError;
  };

  const handleChargeChange = (index: number, key: keyof TaxCharge, value: unknown) => {
    setChargesInput((prev) => {
      let next = prev.map((c, i) => (i === index ? { ...c, [key]: value } : c));
      if (key === "compoundTaxReferences") {
        const currentExternalId = prev[index].externalId;
        next = next.map((c, i) =>
          i !== index
            ? { ...c, compoundTaxReferences: c.compoundTaxReferences.filter((r) => r !== currentExternalId) }
            : c
        );
      }
      return next;
    });
  };

  const addCharge = () => setChargesInput((prev) => [...prev, emptyCharge()]);
  const removeCharge = (index: number) => setChargesInput((prev) => prev.filter((_, i) => i !== index));

  const addRegionalTax = () => setRegionalTaxes((prev) => [...prev, emptyRegionalGroup()]);
  const updateRegionalTax = (index: number, key: keyof RegionalTaxGroup, value: unknown) =>
    setRegionalTaxes((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  const removeRegionalTax = (index: number) => setRegionalTaxes((prev) => prev.filter((_, i) => i !== index));

  const addRegionalTaxCharge = (ri: number) =>
    setRegionalTaxes((prev) =>
      prev.map((r, i) => {
        if (i !== ri) return r;
        const charge = emptyCharge();
        return {
          ...r,
          taxes: [...r.taxes, charge],
          taxRefs: [...r.taxRefs, { value: charge.externalId, label: "" }],
        };
      })
    );
  const updateRegionalTaxCharge = (ri: number, ci: number, key: keyof TaxCharge, value: unknown) =>
    setRegionalTaxes((prev) =>
      prev.map((r, i) => {
        if (i !== ri) return r;
        const newTaxes = r.taxes.map((t, j) => (j === ci ? { ...t, [key]: value } : t));
        const newRefs =
          key === "taxName"
            ? r.taxRefs.map((ref) => (ref.value === r.taxes[ci].externalId ? { ...ref, label: value as string } : ref))
            : r.taxRefs;
        return { ...r, taxes: newTaxes, taxRefs: newRefs };
      })
    );
  const removeRegionalTaxCharge = (ri: number, ci: number) =>
    setRegionalTaxes((prev) =>
      prev.map((r, i) => {
        if (i !== ri) return r;
        const removedId = r.taxes[ci].externalId;
        return {
          ...r,
          taxes: r.taxes.filter((_, j) => j !== ci),
          taxRefs: r.taxRefs.filter((ref) => ref.value !== removedId),
        };
      })
    );

  // Customer group specific helpers
  const toggleCGEnabled = (groupId: string | number, enabled: boolean) =>
    setCustomerGroupTaxes((prev) => ({ ...prev, [groupId]: { ...prev[groupId], enabled } }));

  const addCGCharge = (groupId: string | number) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], taxes: [...(prev[groupId]?.taxes ?? []), emptyCharge()] },
    }));
  const updateCGCharge = (groupId: string | number, ci: number, key: keyof TaxCharge, value: unknown) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        taxes: prev[groupId].taxes.map((t, i) => (i === ci ? { ...t, [key]: value } : t)),
      },
    }));
  const removeCGCharge = (groupId: string | number, ci: number) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], taxes: prev[groupId].taxes.filter((_, i) => i !== ci) },
    }));

  const addCGRegionalTax = (groupId: string | number) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], regionalTaxes: [...(prev[groupId]?.regionalTaxes ?? []), emptyRegionalGroup()] },
    }));
  const updateCGRegionalTax = (groupId: string | number, ri: number, key: keyof RegionalTaxGroup, value: unknown) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        regionalTaxes: prev[groupId].regionalTaxes.map((r, i) => (i === ri ? { ...r, [key]: value } : r)),
      },
    }));
  const removeCGRegionalTax = (groupId: string | number, ri: number) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], regionalTaxes: prev[groupId].regionalTaxes.filter((_, i) => i !== ri) },
    }));

  const addCGRegionalTaxCharge = (groupId: string | number, ri: number) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        regionalTaxes: prev[groupId].regionalTaxes.map((r, i) => {
          if (i !== ri) return r;
          const charge = emptyCharge();
          return { ...r, taxes: [...r.taxes, charge], taxRefs: [...r.taxRefs, { value: charge.externalId, label: "" }] };
        }),
      },
    }));
  const updateCGRegionalTaxCharge = (
    groupId: string | number,
    ri: number,
    ci: number,
    key: keyof TaxCharge,
    value: unknown
  ) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        regionalTaxes: prev[groupId].regionalTaxes.map((r, i) => {
          if (i !== ri) return r;
          const newTaxes = r.taxes.map((t, j) => (j === ci ? { ...t, [key]: value } : t));
          const newRefs =
            key === "taxName"
              ? r.taxRefs.map((ref) => (ref.value === r.taxes[ci].externalId ? { ...ref, label: value as string } : ref))
              : r.taxRefs;
          return { ...r, taxes: newTaxes, taxRefs: newRefs };
        }),
      },
    }));
  const removeCGRegionalTaxCharge = (groupId: string | number, ri: number, ci: number) =>
    setCustomerGroupTaxes((prev) => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        regionalTaxes: prev[groupId].regionalTaxes.map((r, i) => {
          if (i !== ri) return r;
          const removedId = r.taxes[ci].externalId;
          return { ...r, taxes: r.taxes.filter((_, j) => j !== ci), taxRefs: r.taxRefs.filter((ref) => ref.value !== removedId) };
        }),
      },
    }));

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Please enter a tax profile name");
      return;
    }
    if (!validateChargesInput()) {
      toast.error("Every charge needs a name and rate");
      return;
    }

    setSubmitLoading(true);

    let isIncluded = false;
    let isIncludeButDiscountIsNotConsidered = false;
    if (taxApplicationMethod === "true") {
      isIncluded = true;
    } else if (taxApplicationMethod === "discountNotConsidered") {
      isIncludeButDiscountIsNotConsidered = true;
    }

    const globalRegionalTaxes = regionalTaxes.map((entry) => ({
      zipCodePreference: {
        region: entry.state,
        zipCodePreference: entry.zipCodeMode,
        targetZipCodes: entry.zipCodes ?? [],
      },
      taxes: entry.taxes.map(({ isCompound: _c, taxRefs: _r, ...t }: any) => ({
        ...t,
        taxType: normalizeTaxType(t.taxType),
      })),
    }));

    const body = {
      name,
      description: description || null,
      classificationId: classificationId ?? null,
      taxes: chargesInput.map(({ isCompound: _c, ...t }) => ({ ...t, taxType: normalizeTaxType(t.taxType) })),
      isIncluded,
      isIncludeButDiscountIsNotConsidered,
      isDefaultForMJ,
      isDefaultForNonMJ,
      globalRegionalTaxes,
    };

    try {
      if (mode === "add") {
        await createTax(body);
        toast.success("Tax created successfully.");
      } else {
        await updateTax(id!, body);
        toast.success("Tax updated successfully.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function saveCustomerGroupTaxes() {
    if (!id) {
      toast.error("Please save the global tax profile first.");
      return;
    }
    setCgSubmitLoading(true);
    try {
      const enabledGroups = customerGroups.filter((g) => customerGroupTaxes[g.id]?.enabled);
      if (enabledGroups.length === 0) {
        toast.warning("No customer groups are enabled.");
        return;
      }
      await Promise.all(
        enabledGroups.map((group) => {
          const entry = customerGroupTaxes[group.id];
          return setCustomerGroupTaxesAPI({
            taxProfileId: id,
            customerGroupId: group.id,
            rootTaxes: (entry.taxes ?? []).map(({ isCompound: _c, ...t }: any) => ({
              ...t,
              taxType: normalizeTaxType(t.taxType),
              shouldBeForced: t.shouldBeForced || null,
            })),
            regionalTaxes: (entry.regionalTaxes ?? []).map((r) => ({
              zipCodePreference: {
                region: r.state,
                zipCodePreference: r.zipCodeMode,
                targetZipCodes: r.zipCodes ?? [],
              },
              taxes: r.taxes.map(({ isCompound: _c, taxRefs: _r, ...t }: any) => ({
                ...t,
                taxType: normalizeTaxType(t.taxType),
                shouldBeForced: t.shouldBeForced || null,
              })),
            })),
            isEnabled: true,
          });
        })
      );
      toast.success("Customer group taxes saved successfully.");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save customer group taxes.");
    } finally {
      setCgSubmitLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={submitLoading ? undefined : onClose} side="right" size={720}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Tax Profile" : "Edit Tax Profile"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new tax profile" : "Update tax profile configuration"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={submitLoading}>
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="global">Global Tax Settings</TabsTrigger>
                <TabsTrigger value="customerGroup">Customer Group Specific</TabsTrigger>
              </TabsList>

              <TabsContent value="global">
                <div className="flex flex-col gap-4">
                  <Card className="gap-4 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Tax Profile Name" required>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                      </Field>
                      <Field label="Classification">
                        <Select
                          value={classificationId != null ? String(classificationId) : undefined}
                          onValueChange={(v) => setClassificationId(v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Classification" />
                          </SelectTrigger>
                          <SelectContent>
                            {classifications.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field label="Description">
                      <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                    </Field>

                    <Field label="Tax Application Method">
                      <Select
                        value={taxApplicationMethod}
                        onValueChange={(v) => setTaxApplicationMethod(v as typeof taxApplicationMethod)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select tax application method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">Tax not included (e.g., $10 + tax at checkout)</SelectItem>
                          <SelectItem value="true">Tax included (e.g., $10 means $10 total)</SelectItem>
                          <SelectItem value="discountNotConsidered">
                            Tax included, discount not considered
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Default for MJ Product</span>
                        <Switch checked={isDefaultForMJ} onCheckedChange={setIsDefaultForMJ} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Default for Non-MJ Product</span>
                        <Switch checked={isDefaultForNonMJ} onCheckedChange={setIsDefaultForNonMJ} />
                      </div>
                    </div>
                  </Card>

                  <Card className="gap-3 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Tax Charges</p>
                      <Button type="button" variant="outline" size="sm" onClick={addCharge}>
                        <Plus className="size-4" /> Add Charge
                      </Button>
                    </div>
                    {chargesInputError && (
                      <p className="text-xs text-destructive">Every charge needs a name and a rate.</p>
                    )}
                    <div className="flex flex-col gap-2">
                      {chargesInput.map((charge, i) => (
                        <ChargeRow
                          key={charge.externalId}
                          charge={charge}
                          taxRefOptions={taxRefOptions}
                          onChange={(key, value) => handleChargeChange(i, key, value)}
                          onRemove={() => removeCharge(i)}
                          removable={chargesInput.length > 1}
                        />
                      ))}
                    </div>
                  </Card>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Regional Taxes</p>
                    <Button type="button" variant="outline" size="sm" onClick={addRegionalTax}>
                      <Plus className="size-4" /> Add Regional Taxes
                    </Button>
                  </div>
                  {regionalTaxes.map((group, ri) => (
                    <RegionalTaxGroupCard
                      key={ri}
                      group={group}
                      index={ri}
                      onUpdate={(key, value) => updateRegionalTax(ri, key, value)}
                      onRemove={() => removeRegionalTax(ri)}
                      onAddCharge={() => addRegionalTaxCharge(ri)}
                      onUpdateCharge={(ci, key, value) => updateRegionalTaxCharge(ri, ci, key, value)}
                      onRemoveCharge={(ci) => removeRegionalTaxCharge(ri, ci)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="customerGroup">
                <div className="flex flex-col gap-4">
                  {!id && (
                    <p className="text-sm text-muted-foreground">
                      Save the global tax profile first to configure customer group specific taxes.
                    </p>
                  )}
                  {customerGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No customer groups found.</p>
                  ) : (
                    customerGroups.map((group) => {
                      const entry = customerGroupTaxes[group.id] ?? { enabled: false, taxes: [], regionalTaxes: [] };
                      return (
                        <Card key={group.id} className="gap-3 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{group.name}</p>
                            <Switch checked={entry.enabled} onCheckedChange={(v) => toggleCGEnabled(group.id, v)} />
                          </div>

                          {entry.enabled && (
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-muted-foreground">Charges</p>
                                  <Button type="button" variant="outline" size="sm" onClick={() => addCGCharge(group.id)}>
                                    <Plus className="size-4" /> Add Charge
                                  </Button>
                                </div>
                                {(entry.taxes ?? []).map((charge, ci) => (
                                  <ChargeRow
                                    key={charge.externalId}
                                    charge={charge}
                                    taxRefOptions={(entry.taxes ?? []).map((t) => ({
                                      value: t.externalId,
                                      label: t.taxName,
                                    }))}
                                    onChange={(key, value) => updateCGCharge(group.id, ci, key, value)}
                                    onRemove={() => removeCGCharge(group.id, ci)}
                                    removable
                                  />
                                ))}
                              </div>

                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-muted-foreground">Regional Taxes</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addCGRegionalTax(group.id)}
                                  >
                                    <Plus className="size-4" /> Add Regional Taxes
                                  </Button>
                                </div>
                                {(entry.regionalTaxes ?? []).map((rGroup, ri) => (
                                  <RegionalTaxGroupCard
                                    key={ri}
                                    group={rGroup}
                                    index={ri}
                                    onUpdate={(key, value) => updateCGRegionalTax(group.id, ri, key, value)}
                                    onRemove={() => removeCGRegionalTax(group.id, ri)}
                                    onAddCharge={() => addCGRegionalTaxCharge(group.id, ri)}
                                    onUpdateCharge={(ci, key, value) =>
                                      updateCGRegionalTaxCharge(group.id, ri, ci, key, value)
                                    }
                                    onRemoveCharge={(ci) => removeCGRegionalTaxCharge(group.id, ri, ci)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}

                  <div className="flex justify-end">
                    <Button onClick={saveCustomerGroupTaxes} disabled={cgSubmitLoading || !id}>
                      {cgSubmitLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save Customer Group Taxes
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={submitLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitLoading || loading}>
            {submitLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "add" ? "Create Tax Profile" : "Update Tax Profile"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
