"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { getSingleDrawer } from "@/services/registers/getSingleDrawer";
import { createDrawer } from "@/services/drawers/createDrawer";
import { updateDrawer } from "@/services/drawers/updateDrawer";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "@/components/admin/form-fields";

interface DrawerFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  drawerId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  name: string;
  description: string;
}

const EMPTY_VALUES: FormValues = { name: "", description: "" };

export default function DrawerFormDrawer({ open, mode, drawerId, onClose, onSaved }: DrawerFormDrawerProps) {
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      setVersion(undefined);
      return;
    }

    if (mode === "edit" && drawerId) {
      setLoading(true);
      getSingleDrawer(drawerId)
        .then((res) => {
          const drawer = res?.data?.data?.drawer;
          if (!drawer) {
            toast.error("Drawer not found");
            return;
          }
          setValues({ name: drawer.name ?? "", description: drawer.description ?? "" });
          setVersion(drawer.version);
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load drawer"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, drawerId]);

  const handleSave = async () => {
    if (!shopId) return;
    if (!values.name.trim()) {
      toast.error("Please enter a drawer name");
      return;
    }

    setSaving(true);
    try {
      if (mode === "add") {
        await createDrawer({ name: values.name, description: values.description, shopId: shopId as string });
        toast.success("Drawer created successfully");
      } else {
        await updateDrawer(drawerId!, {
          name: values.name,
          description: values.description,
          shopId: shopId as string,
          version: version as number,
        });
        toast.success("Drawer updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{mode === "add" ? "Add Drawer" : "Edit Drawer"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new cash drawer" : "Update drawer details"}
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
              <Field label="Drawer Name" required>
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
