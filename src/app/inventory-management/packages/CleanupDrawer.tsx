"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { populatePackagesWithIds } from "@/services/packages/populateWithIds";
import { fetchInventoryCleanupConfig, updateInventoryCleanupConfig, ignoreInventoryCleanupPackages } from "@/services/inventoryCleanup/config";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Packages the cleanup job has flagged (stale / needs a decision) — old
// app's "View" drawer off the "N packages need cleanup" banner. Reviewing
// here doesn't change anything on its own; "Ignore" excludes a package from
// future cleanup runs via the config's ignoredPackageIds list.
export function CleanupPackagesDrawer({
  open,
  onClose,
  packageIds,
  shopId,
  onIgnored,
}: {
  open: boolean;
  onClose: () => void;
  packageIds: string[];
  shopId: string | number | null;
  onIgnored: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ignoring, setIgnoring] = useState(false);

  useEffect(() => {
    if (!open || !shopId || packageIds.length === 0) return;
    setSelectedIds([]);
    setLoading(true);
    populatePackagesWithIds(shopId as string, packageIds)
      .then((res) => setRows(res?.data?.data?.packages ?? res?.data?.packages ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, shopId, packageIds]);

  const toggle = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  const handleIgnore = async () => {
    if (!shopId || selectedIds.length === 0) return;
    setIgnoring(true);
    try {
      await ignoreInventoryCleanupPackages({ shopId, ignoredPackageIds: selectedIds });
      toast.success(`${selectedIds.length} package${selectedIds.length !== 1 ? "s" : ""} ignored`);
      setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      onIgnored();
    } catch (err: any) {
      toast.error(err?.message || "Failed to ignore packages");
    } finally {
      setIgnoring(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={720}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-base font-semibold leading-tight">Packages Needing Cleanup</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Flagged as stale — ignore any that shouldn't be included going forward
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            &times;
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No packages need cleanup.</div>
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <Table>
                <TableHeader className="[&_tr]:border-b-0">
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-10" />
                    <TableHead>Package ID</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onCheckedChange={(checked) => toggle(row.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="text-primary">{row.advertisedId ?? "-"}</TableCell>
                      <TableCell className="max-w-70 truncate" title={row.name}>
                        {row.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={row.isActive ? "default" : "destructive"}>
                          {row.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <span className="text-xs text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${rows.length} total`}
          </span>
          <Button variant="outline" disabled={selectedIds.length === 0 || ignoring} onClick={handleIgnore}>
            {ignoring ? "Ignoring..." : `Ignore Selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

// Admin-only: configures how the cleanup job decides a package is stale.
// Old app gates this behind hasRole("BOTH"); new POS doesn't have that
// permission concept, so this reuses the SUPER_ADMIN/ADMINISTRATION gate
// already used elsewhere on this page (shouldPopulateMetrcData).
export function CleanupPreferencesDrawer({
  open,
  onClose,
  shopId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string | number | null;
  onSaved: () => void;
}) {
  const [considerationPeriodInDays, setConsiderationPeriodInDays] = useState("15");
  const [shouldFinishWithDiscrepancies, setShouldFinishWithDiscrepancies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !shopId) return;
    setLoading(true);
    fetchInventoryCleanupConfig(shopId as string)
      .then((res) => {
        const config = res?.data?.data ?? {};
        setConsiderationPeriodInDays(String(config?.considerationPeriodInDays ?? 15));
        setShouldFinishWithDiscrepancies(Boolean(config?.shouldFinishPackagesWithMETRCDiscrepancies));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, shopId]);

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      await updateInventoryCleanupConfig({
        shopId,
        considerationPeriodInDays: Number(considerationPeriodInDays) || 15,
        shouldFinishPackagesWithMETRCDiscrepancies: shouldFinishWithDiscrepancies,
      });
      toast.success("Cleanup preferences saved");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={420}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-base font-semibold">Cleanup Preferences</h3>
          <Button variant="outline" size="icon" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <Label className="mb-2">Consideration Period (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={considerationPeriodInDays}
                  onChange={(e) => setConsiderationPeriodInDays(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Packages inactive/unchanged for this many days are flagged as needing cleanup.
                </p>
              </div>

              <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
                <span className="text-sm font-medium">Finish packages with Metrc discrepancies</span>
                <Switch checked={shouldFinishWithDiscrepancies} onCheckedChange={setShouldFinishWithDiscrepancies} />
              </label>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving || loading} onClick={handleSave}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
