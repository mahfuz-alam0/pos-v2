"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Leaf, X } from "lucide-react";

import { createStrain } from "@/services/strains/create";
import { updateStrain } from "@/services/strains/update";
import { fetchSingleStrain } from "@/services/strains/getSingle";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";

interface FormValues {
  name: string;
  description: string;
  imageUrl: string | null;
}

const EMPTY_VALUES: FormValues = { name: "", description: "", imageUrl: null };

interface StrainFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  strainId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function StrainFormDrawer({ open, mode, strainId, onClose, onSaved }: StrainFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      return;
    }

    if (mode === "edit" && strainId) {
      setLoading(true);
      fetchSingleStrain(strainId)
        .then((res) => {
          const s = res?.data;
          if (!s) {
            toast.error("Strain not found");
            return;
          }
          setValues({
            name: s.name ?? "",
            description: s.description ?? "",
            imageUrl: s.imageUrl ?? null,
          });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load strain"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, strainId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter a strain name");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: values.name,
        description: values.description,
        imageUrl: values.imageUrl ?? undefined,
      };
      if (mode === "add") {
        await createStrain(body);
        toast.success("Strain created successfully");
      } else {
        await updateStrain(strainId!, body);
        toast.success("Strain updated successfully");
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
            <Leaf className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Strain" : "Edit Strain"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new strain" : "Update strain details"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Strain Image">
                <SingleImageUpload
                  imageUrl={values.imageUrl}
                  onChange={(imageUrl) => setValues({ ...values, imageUrl })}
                />
              </Field>

              <Field label="Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Description">
                <Textarea
                  rows={4}
                  value={values.description}
                  onChange={(e) => setValues({ ...values, description: e.target.value })}
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
