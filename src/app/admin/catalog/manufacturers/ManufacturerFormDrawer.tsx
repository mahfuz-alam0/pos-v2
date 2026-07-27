"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Factory, X } from "lucide-react";

import { createBrand } from "@/services/brands/create";
import { updateBrand } from "@/services/brands/update";
import { fetchSingleBrand } from "@/services/brands/getSingle";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";

interface FormValues {
  name: string;
  highlights: string;
  details: string;
  image: string | null;
}

const EMPTY_VALUES: FormValues = { name: "", highlights: "", details: "", image: null };

interface ManufacturerFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  brandId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ManufacturerFormDrawer({
  open,
  mode,
  brandId,
  onClose,
  onSaved,
}: ManufacturerFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      return;
    }

    if (mode === "edit" && brandId) {
      setLoading(true);
      fetchSingleBrand(brandId)
        .then((res) => {
          const b = res?.data;
          if (!b) {
            toast.error("Manufacturer not found");
            return;
          }
          setValues({
            name: b.name ?? "",
            highlights: b.highlights ?? "",
            details: b.details ?? "",
            image: b.image ?? null,
          });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load manufacturer"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, brandId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter a brand name");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: values.name,
        highlights: values.highlights,
        details: values.details,
        image: values.image ?? undefined,
      };
      if (mode === "add") {
        await createBrand(body);
        toast.success("Manufacturer created successfully");
      } else {
        await updateBrand(brandId!, body);
        toast.success("Manufacturer updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Factory className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Brand" : "Edit Brand"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new manufacturer" : "Update manufacturer details"}
            </div>
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
              <Field label="Image">
                <SingleImageUpload imageUrl={values.image} onChange={(image) => setValues({ ...values, image })} />
              </Field>

              <Field label="Brand Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Notes">
                <Input
                  value={values.highlights}
                  onChange={(e) => setValues({ ...values, highlights: e.target.value })}
                />
              </Field>

              <Field label="Brand Description">
                <Textarea
                  rows={4}
                  placeholder="Message"
                  value={values.details}
                  onChange={(e) => setValues({ ...values, details: e.target.value })}
                />
              </Field>
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
