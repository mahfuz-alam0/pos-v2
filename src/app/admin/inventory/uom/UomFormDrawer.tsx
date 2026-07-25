"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { fetchSingleUom } from "@/services/uom/getSingle";
import { createUom } from "@/services/uom/create";
import { updateUom } from "@/services/uom/update";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Drawer from "@/components/ui/Drawer";
import UomFormFields from "./UomFormFields";

const emptyValues = {
  name: "",
  shortForm: "",
  applicationType: "SELLABLE_STOCK",
  measurementType: null,
  targetUomId: null,
  conversionRate: "",
  description: "",
};

export default function UomFormDrawer({ open, uomId, onClose, onSaved }) {
  const isEdit = Boolean(uomId);
  const [values, setValues] = useState(emptyValues);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!uomId) {
      setValues(emptyValues);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await fetchSingleUom(uomId);
        const uom = res?.data?.data?.uom;
        if (!uom) {
          toast.error("Unit of measurement not found");
          return;
        }
        setValues({
          name: uom.name || "",
          shortForm: uom.shortForm || "",
          applicationType: uom.applicationType || "SELLABLE_STOCK",
          measurementType: uom.measurementType || null,
          targetUomId: uom.targetUomId ?? uom.targetUom?.id ?? null,
          conversionRate: uom.conversionRate ?? "",
          description: uom.description || "",
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to load unit of measurement");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, uomId]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    if (!values.name.trim()) return toast.error("Please enter a measurement name");
    if (!values.shortForm.trim()) return toast.error("Please enter a short form");
    if (values.applicationType === "DISPLAY_STOCK" && !values.targetUomId) {
      return toast.error("Please select a unit of measurement");
    }

    const payload: Record<string, any> = {
      name: values.name,
      shortForm: values.shortForm,
      applicationType: values.applicationType,
      description: values.description,
    };
    if (values.applicationType === "DISPLAY_STOCK") {
      payload.targetUomId = values.targetUomId;
      payload.conversionRate = values.conversionRate;
    } else {
      payload.measurementType = values.measurementType;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateUom(uomId, payload);
        toast.success("Unit of measurement updated successfully");
      } else {
        await createUom(payload);
        toast.success("Unit of measurement created successfully");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={handleClose} side="right" size={480} zIndex={40}>
      <div className="flex h-full flex-col">
        <div className="relative z-10 px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Unit of Measurement" : "Add Unit of Measurement"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEdit ? "Update the details of this unit." : "Define a new unit of measurement."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <UomFormFields values={values} onChange={setValues} applicationTypeDisabled={isEdit} />
          )}
        </div>

        <div className="relative z-10 flex justify-end gap-2 bg-muted/30 p-4 shadow-[0_-1px_3px_rgba(0,0,0,0.08)]">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
