"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";

import { createClassification } from "@/services/classifications/create";
import { updateClassification } from "@/services/classifications/update";
import { fetchSingleClassification } from "@/services/classifications/getSingle";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";

interface FormValues {
  name: string;
  details: string;
  isMJ: boolean;
  image: string | null;
}

const EMPTY_VALUES: FormValues = { name: "", details: "", isMJ: false, image: null };

interface ClassificationFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  classificationId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ClassificationFormDrawer({
  open,
  mode,
  classificationId,
  onClose,
  onSaved,
}: ClassificationFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      return;
    }

    if (mode === "edit" && classificationId) {
      setLoading(true);
      fetchSingleClassification(classificationId)
        .then((res) => {
          const c = res?.data;
          if (!c) {
            toast.error("Classification not found");
            return;
          }
          setValues({
            name: c.name ?? "",
            details: c.details ?? "",
            isMJ: !!c.isMJ,
            image: c.image ?? null,
          });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load classification"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, classificationId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter a classification name");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: values.name,
        details: values.details,
        isMJ: values.isMJ,
        image: values.image ?? undefined,
      };
      if (mode === "add") {
        await createClassification(body);
        toast.success("Classification added successfully");
      } else {
        await updateClassification(classificationId!, body);
        toast.success("Classification updated successfully");
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
            <Tag className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Classification" : "Edit Classification"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new classification" : "Update classification details"}
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
              <Field label="Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Description">
                <Textarea
                  rows={4}
                  placeholder="Message"
                  value={values.details}
                  onChange={(e) => setValues({ ...values, details: e.target.value })}
                />
              </Field>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setValues({ ...values, isMJ: !values.isMJ })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setValues({ ...values, isMJ: !values.isMJ });
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted/40 p-3.5 ring-1 ring-foreground/10"
              >
                <div>
                  <div className="text-sm font-semibold">Is MJ</div>
                  <div className="text-xs text-muted-foreground">Mark this classification as a marijuana product</div>
                </div>
                <Switch
                  checked={values.isMJ}
                  onCheckedChange={(checked) => setValues({ ...values, isMJ: checked })}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <Field label="Upload Image">
                <SingleImageUpload imageUrl={values.image} onChange={(image) => setValues({ ...values, image })} />
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
