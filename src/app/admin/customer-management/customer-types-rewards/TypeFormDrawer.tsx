"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";

import { createCustomerType } from "@/services/customerTypes/create";
import { updateCustomerType } from "@/services/customerTypes/update";
import { getSingleCustomerType } from "@/services/customerTypes/getSingle";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/admin/form-fields";

interface FormValues {
  name: string;
  description: string;
}

const EMPTY_VALUES: FormValues = { name: "", description: "" };

interface TypeFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  typeId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TypeFormDrawer({ open, mode, typeId, onClose, onSaved }: TypeFormDrawerProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      return;
    }

    if (mode === "edit" && typeId) {
      setLoading(true);
      getSingleCustomerType(typeId)
        .then((res) => {
          const t = res?.data;
          if (!t) {
            toast.error("Customer type not found");
            return;
          }
          setValues({ name: t.name ?? "", description: t.description ?? "" });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load customer type"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, typeId]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter customer type name");
      return;
    }
    if (!values.description.trim()) {
      toast.error("Please enter description");
      return;
    }
    setSaving(true);
    try {
      const body = { name: values.name, description: values.description };
      if (mode === "add") {
        await createCustomerType(body);
        toast.success("Customer type created successfully");
      } else {
        await updateCustomerType(typeId!, body);
        toast.success("Customer type updated successfully");
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
              {mode === "add" ? "Add Customer Type" : "Edit Customer Type"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new customer type" : "Update customer type details"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Description" required>
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
