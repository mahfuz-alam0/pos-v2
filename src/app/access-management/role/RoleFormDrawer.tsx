"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { getPermissionBoundaries } from "@/services/roles/getPermissionBoundaries";
import { fetchSingleRole } from "@/services/roles/getSingle";
import { createRole } from "@/services/roles/create";
import { updateRole } from "@/services/roles/update";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import PermissionBoundaryTree, { PermissionBoundaryNode, PermissionEntry } from "./PermissionBoundaryTree";

interface RoleFormDrawerProps {
  open: boolean;
  mode: "add" | "edit";
  roleId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function RoleFormDrawer({ open, mode, roleId, onClose, onSaved }: RoleFormDrawerProps) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [colorCode, setColorCode] = useState("#3B82F6");
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [boundaries, setBoundaries] = useState<PermissionBoundaryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setName("");
    setColorCode("#3B82F6");
    setPermissions([]);

    Promise.all([
      getPermissionBoundaries(),
      isEdit && roleId ? fetchSingleRole(roleId) : Promise.resolve({ data: null }),
    ])
      .then(([boundariesRes, roleRes]) => {
        setBoundaries(boundariesRes?.data ?? []);
        if (roleRes?.data) {
          setName(roleRes.data.name ?? "");
          setColorCode(roleRes.data.colorCode ?? "#3B82F6");
          setPermissions(roleRes.data.permissions ?? []);
        }
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load role data"))
      .finally(() => setLoading(false));
  }, [open, isEdit, roleId]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Please enter a role name");
    if (permissions.length === 0) return toast.error("Please select at least one permission");

    setSaving(true);
    try {
      const body = { name, colorCode, permissions };
      if (isEdit) {
        await updateRole({ ...body, id: roleId });
        toast.success("Role updated successfully");
      } else {
        await createRole(body);
        toast.success("Role created successfully");
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
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size="80%">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Access Management</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Employee Role</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-primary">{isEdit ? "Edit Employee Role" : "Create Employee Role"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-foreground uppercase">Role Name</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">Enter the name for this employee Role</p>
                  </div>
                  <Input className="h-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" />
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-foreground uppercase">Role Color</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">Choose a color to identify this Role</p>
                  </div>
                  <label className="flex w-fit cursor-pointer items-center gap-2.5">
                    <input
                      type="color"
                      value={colorCode}
                      onChange={(e) => setColorCode(e.target.value)}
                      className="size-10 cursor-pointer rounded-lg border border-input"
                    />
                    <span className="text-sm font-medium text-muted-foreground">{colorCode}</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold">Permissions</h3>
                <PermissionBoundaryTree nodes={boundaries} permissions={permissions} onChange={setPermissions} />
              </div>
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
