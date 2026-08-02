"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { fetchSingleEmployeeGroup } from "@/services/employeeGroups/getSingle";
import { createEmployeeGroup } from "@/services/employeeGroups/create";
import { updateEmployeeGroup } from "@/services/employeeGroups/update";
import { fetchLegacyPermissionsTree } from "@/services/employeeGroups/getPermissionsTree";
import { fetchAccessControlledEmployees } from "@/services/employees/listAccessControlled";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Field, ShopMultiSelect } from "@/components/admin/form-fields";
import LegacyPermissionTree, { LegacyPermissionEntry, LegacyPermissionNode } from "./LegacyPermissionTree";

export default function GroupFormPage({ groupId }: { groupId?: string }) {
  const router = useRouter();
  const isEdit = !!groupId;

  const [name, setName] = useState("");
  const [shopPreference, setShopPreference] = useState<"PARTICULAR_STORE" | "ACROSS_THE_ORGANIZATION">("PARTICULAR_STORE");
  const [associatedShopIds, setAssociatedShopIds] = useState<(string | number)[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [permissionNodes, setPermissionNodes] = useState<LegacyPermissionNode[]>([]);
  const [checkedCodes, setCheckedCodes] = useState<string[]>([]);
  const [permissionEntries, setPermissionEntries] = useState<LegacyPermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");
    const orgId = userInfo?.orgId;

    Promise.all([
      fetchAccessControlledEmployees(100, 1),
      orgId ? fetchLegacyPermissionsTree(orgId) : Promise.resolve({ data: [] }),
      isEdit ? fetchSingleEmployeeGroup(groupId!) : Promise.resolve({ data: null }),
    ])
      .then(([employeesRes, permissionsRes, groupRes]) => {
        setEmployees(employeesRes?.data?.employees ?? []);
        setPermissionNodes(permissionsRes?.data ?? []);

        if (groupRes?.data) {
          const g = groupRes.data;
          setName(g.name ?? "");
          setShopPreference(g.shopPreference ?? "PARTICULAR_STORE");
          setAssociatedShopIds(g.associatedShopIds ?? []);
          setSelectedEmployees((g.associatedEmployees ?? []).map((e: any) => String(e.id ?? e)));
          const codes = Object.keys(g.permissionCodeActionEffectMap ?? {});
          setCheckedCodes(codes);
        }
      })
      .catch((err: any) => toast.error(err?.message || "Failed to load group data"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Please enter a group name");
    if (shopPreference === "PARTICULAR_STORE" && associatedShopIds.length === 0) {
      return toast.error("Associated Shops is required");
    }
    if (checkedCodes.length === 0) return toast.warning("Please select at least one permission");
    if (selectedEmployees.length === 0) return toast.warning("Please select at least one employee");

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        shopPreference,
        permissionActions: permissionEntries,
        associatedEmployees: selectedEmployees,
      };
      if (shopPreference === "PARTICULAR_STORE") body.associatedShopIds = associatedShopIds;

      if (isEdit) {
        await updateEmployeeGroup({ ...body, id: groupId });
        toast.success("Employee group updated successfully");
      } else {
        await createEmployeeGroup(body);
        toast.success("Employee group created successfully");
      }
      router.push("/access-management/employee-group");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Access Management</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/access-management/employee-group">Employee Groups</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isEdit ? "Edit" : "Add"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Group Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Shop Preference">
            <div className="flex rounded-lg bg-muted p-0.5 w-fit">
              {(["PARTICULAR_STORE", "ACROSS_THE_ORGANIZATION"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setShopPreference(p)}
                  className={`rounded-[7px] px-4 py-2 text-xs font-semibold transition-colors ${shopPreference === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/60"}`}
                >
                  {p === "PARTICULAR_STORE" ? "Particular Store" : "Across the Organization"}
                </button>
              ))}
            </div>
          </Field>

          {shopPreference === "PARTICULAR_STORE" && (
            <Field label="Associated Shops" required>
              <ShopMultiSelect value={associatedShopIds} onChange={setAssociatedShopIds} />
            </Field>
          )}

          <Tabs defaultValue="employees">
            <TabsList>
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
                <Table>
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow className="bg-muted/60">
                      <TableHead className="w-10" />
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e, i) => (
                      <TableRow key={e.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}>
                        <TableCell>
                          <Checkbox checked={selectedEmployees.includes(String(e.id))} onCheckedChange={() => toggleEmployee(String(e.id))} />
                        </TableCell>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{e.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="permissions">
              <LegacyPermissionTree
                nodes={permissionNodes}
                checkedCodes={checkedCodes}
                onChange={(codes, entries) => {
                  setCheckedCodes(codes);
                  setPermissionEntries(entries);
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/access-management/employee-group")} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
