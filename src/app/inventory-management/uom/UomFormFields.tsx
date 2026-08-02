"use client";

import { useCallback } from "react";

import { fetchUomList } from "@/services/uom/list";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiSelect } from "@/components/ui/api-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MEASUREMENT_TYPES = [
  { value: "LENGTH", label: "Length" },
  { value: "MASS", label: "Mass" },
  { value: "VOLUME", label: "Volume" },
  { value: "WHOLE_NUMBER_QUANTITY", label: "Whole Number Quantity" },
  { value: "FRACTIONAL_NUMBER_QUANTITY", label: "Fractional Number Quantity" },
];

export default function UomFormFields({ values, onChange, applicationTypeDisabled = false }) {
  const fetchSellableUomPage = useCallback(async (page: number, search: string) => {
    const res = await fetchUomList({ page, limit: 10, search, applicationTypes: "SELLABLE_STOCK" } as any);
    const uoms = res?.data?.data?.uoms ?? [];
    return {
      items: uoms.map((u: any) => ({ id: u.id, name: u.name })),
      totalPages: res?.data?.data?.paginationData?.totalPages ?? 1,
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Measurement Name</Label>
          <Input
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            placeholder="e.g. Kilogram"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Short Form</Label>
          <Input
            value={values.shortForm}
            onChange={(e) => onChange({ ...values, shortForm: e.target.value })}
            placeholder="e.g. kg"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Application Type</Label>
        <Select
          items={{ SELLABLE_STOCK: "Sellable Stock", DISPLAY_STOCK: "Display Stock" }}
          value={values.applicationType || null}
          onValueChange={(v) => onChange({ ...values, applicationType: v })}
          disabled={applicationTypeDisabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select application type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SELLABLE_STOCK">Sellable Stock</SelectItem>
            <SelectItem value="DISPLAY_STOCK">Display Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {values.applicationType === "DISPLAY_STOCK" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Unit of Measurement</Label>
            <ApiSelect
              placeholder="Select unit of measurement"
              value={values.targetUomId ?? null}
              onChange={(id) => onChange({ ...values, targetUomId: id })}
              fetchPage={fetchSellableUomPage}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Conversion Rate</Label>
            <Input
              type="number"
              value={values.conversionRate ?? ""}
              onChange={(e) => onChange({ ...values, conversionRate: e.target.value })}
              placeholder="e.g. 1000"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label>Measurement Type</Label>
          <Select
            items={Object.fromEntries(MEASUREMENT_TYPES.map((t) => [t.value, t.label]))}
            value={values.measurementType || null}
            onValueChange={(v) => onChange({ ...values, measurementType: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Define nature of your measurement unit" />
            </SelectTrigger>
            <SelectContent>
              {MEASUREMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Description</Label>
        <Textarea
          rows={4}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          placeholder="Optional description"
        />
      </div>
    </div>
  );
}
