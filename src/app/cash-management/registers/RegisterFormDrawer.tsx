"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Monitor, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleRegister } from "@/services/registers/getSingleRegister";
import { createRegister } from "@/services/registers/createRegister";
import { updateRegister } from "@/services/registers/updateRegister";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";
import { fetchTransactionDrawers } from "@/services/transactions/listDrawers";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiApiSelect } from "@/components/ui/multi-api-select";
import { Field } from "@/components/admin/form-fields";

interface RegisterFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  registerId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  name: string;
  employeeIds: string[];
  drawerIds: string[];
  canBeOpenedOnOpenHoursOnly: boolean;
  description: string;
}

const EMPTY_VALUES: FormValues = {
  name: "",
  employeeIds: [],
  drawerIds: [],
  canBeOpenedOnOpenHoursOnly: false,
  description: "",
};

export default function RegisterFormDrawer({ open, mode, registerId, onClose, onSaved }: RegisterFormDrawerProps) {
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [employeeLabels, setEmployeeLabels] = useState<{ id: string; name: string }[]>([]);
  const [drawerLabels, setDrawerLabels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      setVersion(undefined);
      setEmployeeLabels([]);
      setDrawerLabels([]);
      return;
    }

    if (mode === "edit" && registerId) {
      setLoading(true);
      fetchSingleRegister(registerId, shopId as string)
        .then((res) => {
          const register = res?.data;
          if (!register) {
            toast.error("Register not found");
            return;
          }
          setValues({
            name: register.name ?? "",
            employeeIds: (register.employees ?? []).map((e: any) => String(e.id)),
            drawerIds: (register.drawers ?? []).map((d: any) => String(d.id)),
            canBeOpenedOnOpenHoursOnly: !!register.canBeOpenedOnOpenHoursOnly,
            description: register.description ?? "",
          });
          setVersion(register.version);
          setEmployeeLabels((register.employees ?? []).map((e: any) => ({ id: String(e.id), name: e.name })));
          setDrawerLabels((register.drawers ?? []).map((d: any) => ({ id: String(d.id), name: d.name })));
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load register"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, registerId, shopId]);

  const handleSave = async () => {
    if (!shopId) return;
    if (!values.name.trim()) {
      toast.error("Please enter a register name");
      return;
    }
    if (values.employeeIds.length === 0) {
      toast.error("Associated Employees is required");
      return;
    }
    if (values.drawerIds.length === 0) {
      toast.error("Associated Drawers is required");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: values.name,
        privilegedEmployeeIds: values.employeeIds,
        associatedDrawerIds: values.drawerIds,
        canBeOpenedOnOpenHoursOnly: values.canBeOpenedOnOpenHoursOnly,
        description: values.description,
        shopId,
      };

      if (mode === "add") {
        await createRegister(body);
        toast.success("Register created successfully");
      } else {
        await updateRegister(registerId!, { ...body, version });
        toast.success("Register updated successfully");
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
            <Monitor className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">{mode === "add" ? "Add Register" : "Edit Register"}</div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new POS register" : "Update register details"}
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
              <Field label="Register Name" required>
                <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} />
              </Field>

              <Field label="Associated Employees" required>
                <MultiApiSelect
                  placeholder="Select Employees"
                  value={values.employeeIds}
                  onChange={(ids) => setValues({ ...values, employeeIds: ids })}
                  initialLabels={employeeLabels}
                  fetchPage={async (page, search) => {
                    const res = await fetchAccessControlledEmployees(20, page, search);
                    return {
                      items: (res?.data?.employees ?? []).map((e: any) => ({ id: String(e.id), name: e.name })),
                      totalPages: res?.data?.paginationData?.totalPages ?? 1,
                    };
                  }}
                  triggerClassName="w-full"
                />
              </Field>

              <Field label="Associated Drawers" required>
                <MultiApiSelect
                  placeholder="Select Drawers"
                  value={values.drawerIds}
                  onChange={(ids) => setValues({ ...values, drawerIds: ids })}
                  initialLabels={drawerLabels}
                  fetchPage={async () => {
                    const res = await fetchTransactionDrawers(shopId as string, 100);
                    return {
                      items: (res?.data ?? []).map((d: any) => ({ id: String(d.id), name: d.name })),
                      totalPages: 1,
                    };
                  }}
                  triggerClassName="w-full"
                />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.canBeOpenedOnOpenHoursOnly}
                  onCheckedChange={(checked) => setValues({ ...values, canBeOpenedOnOpenHoursOnly: !!checked })}
                />
                Can be opened on open hours only?
              </label>

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
          <Button variant="outline" className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
