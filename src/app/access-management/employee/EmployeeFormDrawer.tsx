"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { useShop } from "@/context/shop-context";
import { fetchSingleEmployee } from "@/services/employees/getSingle";
import { createEmployeeAccount } from "@/services/employees/create";
import { updateEmployeeAccount } from "@/services/employees/update";
import { fetchShopsData } from "@/services/shops/list";
import { listRegisters } from "@/services/registers/listRegisters";
import { fetchRolesList } from "@/services/roles/list";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, ShopMultiSelect, SingleImageUpload } from "@/components/admin/form-fields";
import SimpleFileUpload from "@/app/inventory-management/packages/SimpleFileUpload";

interface EmployeeFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  employeeId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  name: string;
  email: string;
  useEmailAsUsername: boolean;
  username: string;
  password: string;
  phone: string;
  type: "ADMINISTRATION" | "ACCESS_CONTROLLED";
  associatedShopIds: (string | number)[];
  preferredRegisterId: string;
  roleId: string;
  avatarUrl: string | null;
  documentLinks: string[];
}

const EMPTY_VALUES: FormValues = {
  name: "",
  email: "",
  useEmailAsUsername: true,
  username: "",
  password: "",
  phone: "",
  type: "ADMINISTRATION",
  associatedShopIds: [],
  preferredRegisterId: "",
  roleId: "",
  avatarUrl: null,
  documentLinks: [],
};

export default function EmployeeFormDrawer({ open, mode, employeeId, onClose, onSaved }: EmployeeFormDrawerProps) {
  const { shopId } = useShop();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [registers, setRegisters] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setValues(EMPTY_VALUES);
      return;
    }

    if (mode === "edit" && employeeId) {
      setLoading(true);
      fetchSingleEmployee(employeeId)
        .then((res) => {
          const employee = res?.data?.account ?? res?.data?.employee ?? res?.data;
          if (!employee) {
            toast.error("Employee not found");
            return;
          }
          setValues({
            name: employee.name ?? "",
            email: employee.email ?? "",
            useEmailAsUsername: employee.username === employee.email,
            username: employee.username ?? "",
            password: "",
            phone: employee.phone?.replace(/^\+/, "") ?? "",
            type: employee.type === "ACCESS_CONTROLLED" ? "ACCESS_CONTROLLED" : "ADMINISTRATION",
            associatedShopIds: employee.associatedShopIds ?? [],
            preferredRegisterId: employee.preferredRegisterId ?? "",
            roleId: employee.roleId ?? employee.roleInfo?.id ?? "",
            avatarUrl: employee.avatarUrl ?? null,
            documentLinks: employee.documentLinks ?? [],
          });
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load employee"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, employeeId]);

  useEffect(() => {
    if (!open) return;
    if (values.associatedShopIds.length === 0) {
      setRegisters([]);
      return;
    }
    listRegisters(String(values.associatedShopIds[0])).then((res) =>
      setRegisters(res?.data?.data?.registers ?? [])
    );
  }, [open, values.associatedShopIds]);

  useEffect(() => {
    if (!open) return;
    fetchRolesList({ limit: 100 }).then((res) => setRoles(res?.data?.roles ?? []));
  }, [open]);

  const handleSave = async () => {
    if (!values.name.trim()) return toast.error("Please enter a name");
    if (!values.email.trim()) return toast.error("Please enter an email");
    if (!values.phone.trim()) return toast.error("Please enter a phone number");
    if (!values.useEmailAsUsername && !values.username.trim()) return toast.error("Please enter a username");
    if (mode === "add" && !values.password.trim()) return toast.error("Please enter a password");
    if (values.associatedShopIds.length === 0) return toast.error("Associated Shops is required");
    if (values.type === "ACCESS_CONTROLLED" && !values.roleId) return toast.error("Employee Role is required");

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        email: values.email,
        username: values.useEmailAsUsername ? values.email : values.username,
        phone: values.phone ? `+${values.phone}` : undefined,
        documentLinks: values.documentLinks,
        avatarUrl: values.avatarUrl,
        associatedShopIds: values.associatedShopIds,
        roleId: values.roleId || undefined,
        type: values.type,
      };

      if (mode === "add") {
        body.preferredRegisterId = values.preferredRegisterId || undefined;
        body.givenPassword = values.password;
        await createEmployeeAccount(body);
        toast.success("Employee created successfully");
      } else {
        body.id = employeeId;
        await updateEmployeeAccount(body);
        toast.success("Employee updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const heading = mode === "add" ? "Add New Employee" : "Edit Employee";
  const subtitle = mode === "add" ? "Create a new employee account with access permissions" : "Update this employee's account and access permissions";

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size="80%">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold">{mode === "add" ? "Add New Employee" : "Edit Employee"}</div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-primary">Employee</span>
                  <span className="text-muted-foreground">&gt;</span>
                  <span className="text-muted-foreground">{mode === "add" ? "Add Employee" : "Edit Employee"}</span>
                </div>
                <h2 className="mt-2 text-2xl font-bold">{heading}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              </div>

              <div className="border-t border-border" />

              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
                  <h3 className="text-sm font-semibold">Personal Information</h3>

                  <Field label="Full Name" required>
                    <Input className="h-10" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="Enter full name" />
                  </Field>

                  <Field label="Email Address" required>
                    <Input className="h-10" type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
                  </Field>

                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      Username
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={values.useEmailAsUsername}
                        onCheckedChange={(checked) => setValues({ ...values, useEmailAsUsername: !!checked })}
                      />
                      Use email as username
                    </label>
                    {!values.useEmailAsUsername && (
                      <Input className="h-10" value={values.username} onChange={(e) => setValues({ ...values, username: e.target.value })} placeholder="Enter username" />
                    )}
                  </div>

                  {mode === "add" && (
                    <Field label="Password" required>
                      <Input className="h-10" type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
                    </Field>
                  )}

                  <Field label="Phone Number">
                    <PhoneInput
                      country="us"
                      enableSearch
                      value={values.phone}
                      onChange={(phone) => setValues({ ...values, phone })}
                      inputClass="!w-full !h-10"
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-4 rounded-xl border border-border p-5">
                  <h3 className="text-sm font-semibold">Access Configuration</h3>

                  <Field label="Account Type">
                    <div className="flex flex-col gap-2">
                      {(["ADMINISTRATION", "ACCESS_CONTROLLED"] as const).map((t) => (
                        <label key={t} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="employee-account-type"
                            checked={values.type === t}
                            onChange={() => setValues({ ...values, type: t, associatedShopIds: [], roleId: "" })}
                            style={{ accentColor: "var(--primary)" }}
                            className="size-4"
                          />
                          {t === "ADMINISTRATION" ? "Administrative Access" : "Access Controlled"}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <Field label="Associated Shops" required>
                    <ShopMultiSelect
                      value={values.associatedShopIds}
                      onChange={(ids) => setValues({ ...values, associatedShopIds: ids, preferredRegisterId: "" })}
                    />
                  </Field>

                  {mode === "add" && values.associatedShopIds.length > 0 && registers.length > 0 && (
                    <Field label="Preferred Register">
                      <Select
                        items={[{ value: "", label: "None" }, ...registers.map((r) => ({ value: r.id, label: r.name }))]}
                        value={values.preferredRegisterId}
                        onValueChange={(v) => setValues({ ...values, preferredRegisterId: v as string })}
                      >
                        <SelectTrigger className="h-10! w-full">
                          <SelectValue placeholder="Select register" />
                        </SelectTrigger>
                        <SelectContent>
                          {registers.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}

                  {values.type === "ACCESS_CONTROLLED" && (
                    <Field label="Employee Role" required>
                      <Select
                        items={[{ value: "", label: "Select a role" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
                        value={values.roleId}
                        onValueChange={(v) => setValues({ ...values, roleId: v as string })}
                      >
                        <SelectTrigger className="h-10! w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>
              </div>

              <div className="border-t border-border" />

              <div>
                <h3 className="mb-3 text-sm font-semibold">Documents & Media</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div className="rounded-xl border border-border p-5">
                    <p className="mb-3 text-sm font-medium">Profile Picture</p>
                    <SingleImageUpload imageUrl={values.avatarUrl} onChange={(url) => setValues({ ...values, avatarUrl: url })} />
                  </div>
                  <div className="rounded-xl border border-border p-5">
                    <p className="mb-3 text-sm font-medium">Identification Documents</p>
                    <SimpleFileUpload
                      files={values.documentLinks.map((url) => ({ url }))}
                      onChange={(files) => setValues((v) => ({ ...v, documentLinks: files.map((f) => f.url) }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="h-9! rounded! px-3.5! text-[14px]! font-normal!" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : mode === "add" ? "Create Employee" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
