"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, X } from "lucide-react";

import { createBusinessEntity } from "@/services/businessEntities/create";
import { updateBusinessEntity } from "@/services/businessEntities/update";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/form-fields";
import { MultiApiSelect } from "@/components/ui/multi-api-select";

import type { EntityRow, ShopOption } from "./types";

interface EntityFormDrawerProps {
  open: boolean;
  entity: EntityRow | null;
  shops: ShopOption[];
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_VALUES = { name: "", associatedTenantIds: [] as string[] };

export default function EntityFormDrawer({ open, entity, shops, onClose, onSaved }: EntityFormDrawerProps) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(
      entity
        ? { name: entity.name, associatedTenantIds: entity.associatedTenantIds || [] }
        : EMPTY_VALUES
    );
  }, [open, entity]);

  const handleSave = async () => {
    if (!values.name.trim()) {
      toast.error("Please enter entity name");
      return;
    }
    setSaving(true);
    try {
      if (entity) {
        await updateBusinessEntity({ id: entity.id, ...values });
        toast.success("Entity updated successfully");
      } else {
        await createBusinessEntity(values);
        toast.success("Entity created successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${entity ? "update" : "create"} entity`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{entity ? "Edit Entity" : "Add Entity"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {entity ? "Update entity details" : "Create a new business entity"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <Field label="Entity Name" required>
              <Input
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
                placeholder="Enter entity name"
              />
            </Field>

            <Field label="Associated Shops">
              <MultiApiSelect
                placeholder="Select shops"
                value={values.associatedTenantIds}
                onChange={(ids) => setValues({ ...values, associatedTenantIds: ids })}
                items={shops.map((s: any) => ({ id: s.id || s._id, name: s.name || s.shopName }))}
                triggerClassName="w-full"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : entity ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
