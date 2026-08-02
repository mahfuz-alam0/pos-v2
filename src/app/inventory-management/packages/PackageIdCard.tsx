"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, TriangleAlert, X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchPackagesMinimalExtended } from "@/services/packages/listMinimalExtended";
import { changeAdvertisedId } from "@/services/packages/changeAdvertisedId";
import { generateExternalPackageId } from "@/services/packages/generateExternalId";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Drawer from "@/components/ui/Drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { PackageDetail } from "./types";

// Package ID summary card + "Change Package ID" drawer, shared logic ported
// from the old app's PackageIdCard.jsx. Handles: copy id, generate a new id,
// live duplicate check (last 5 digits), and committing the id change.
export default function PackageIdCard({
  packageDetail,
  onChanged,
}: {
  packageDetail: PackageDetail | null;
  onChanged?: () => void;
}) {
  const { shopId } = useShop();

  const [changeIdDrawerOpen, setChangeIdDrawerOpen] = useState(false);
  const [newAdvertisedId, setNewAdvertisedId] = useState("");
  const [changeIdLoading, setChangeIdLoading] = useState(false);
  const [changeIdError, setChangeIdError] = useState("");
  const [generateIdLoading, setGenerateIdLoading] = useState(false);
  const [duplicateIdWarning, setDuplicateIdWarning] = useState("");
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false);
  const [confirmChangeOpen, setConfirmChangeOpen] = useState(false);

  // Match on just the last 5 characters — scanned/entered package ids can
  // carry a shared prefix, so the meaningful, unique part to check for a
  // collision is the tail of the id.
  const fetchPackagesByLastFiveDigits = async (id: string) => {
    const trimmedId = (id || "").trim();
    if (!trimmedId) return [];
    const lastFiveDigits = trimmedId.slice(-5);
    const res = await fetchPackagesMinimalExtended(shopId as string, {
      page: 1,
      limit: 50,
      packageName: lastFiveDigits,
      isFinished: false,
      sortByCreatedAt: -1,
    });
    return res?.data?.packages || [];
  };

  const checkPackageIdExists = async (id: string) => {
    const packages = await fetchPackagesByLastFiveDigits(id);
    return packages.length > 0;
  };

  // Clicking the Package ID re-checks it against the system for other
  // packages sharing the same last 5 digits.
  const handlePackageIdClick = async () => {
    if (!packageDetail?.advertisedId || !shopId) return;
    setDuplicateCheckLoading(true);
    setDuplicateIdWarning("");
    try {
      const packages = await fetchPackagesByLastFiveDigits(packageDetail.advertisedId);
      const others = packages.filter((pkg: any) => pkg.id !== packageDetail.id);
      if (others.length > 0) {
        setDuplicateIdWarning(
          `${others.length} other package${others.length > 1 ? "s" : ""} in the system share the same last 5 digits as this ID.`
        );
      }
    } catch {
      toast.error("Failed to check for duplicate package IDs");
    } finally {
      setDuplicateCheckLoading(false);
    }
  };

  useEffect(() => {
    // Switching packages should clear any stale duplicate-id warning from
    // the previously viewed package, then re-check the newly loaded one
    // automatically as soon as this card mounts/updates.
    setDuplicateIdWarning("");
    if (packageDetail?.advertisedId && shopId) {
      handlePackageIdClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageDetail?.id, shopId]);

  // Live-check the id while the drawer is open — fires as soon as a value
  // is present (typed or generated), not only when the user hits Change ID.
  useEffect(() => {
    if (!changeIdDrawerOpen) return;
    const trimmedId = newAdvertisedId.trim();
    if (trimmedId.length < 5) {
      setChangeIdError("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const exists = await checkPackageIdExists(trimmedId);
        setChangeIdError(
          exists ? "A package with the same last 5 digits of this ID already exists in the system." : ""
        );
      } catch {
        // Silent — the submit-time check below will surface a clear error.
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAdvertisedId, changeIdDrawerOpen]);

  const submitChangePackageId = async () => {
    if (!shopId || !packageDetail?.id) return;
    setChangeIdLoading(true);
    try {
      await changeAdvertisedId(shopId as string, packageDetail.id, newAdvertisedId.trim());
      toast.success("Package ID changed successfully");
      setConfirmChangeOpen(false);
      setChangeIdDrawerOpen(false);
      setNewAdvertisedId("");
      onChanged?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.data?.message || error?.message || "Failed to change Package ID");
    } finally {
      setChangeIdLoading(false);
    }
  };

  const handleChangePackageId = async () => {
    if (!newAdvertisedId.trim()) {
      setChangeIdError("Please enter a new Package ID.");
      return;
    }
    setChangeIdLoading(true);
    setChangeIdError("");
    try {
      const exists = await checkPackageIdExists(newAdvertisedId);
      if (exists) {
        setChangeIdError("A package with the same last 5 digits of this ID already exists in the system.");
        setChangeIdLoading(false);
        return;
      }
      setChangeIdLoading(false);
      setConfirmChangeOpen(true);
    } catch {
      setChangeIdError("Failed to verify Package ID. Please try again.");
      setChangeIdLoading(false);
    }
  };

  const handleGeneratePackageId = async () => {
    if (!shopId) return;
    setGenerateIdLoading(true);
    setChangeIdError("");
    try {
      const res = await generateExternalPackageId(shopId as string);
      const packageId = res?.data?.packageId ?? res?.data;
      if (!packageId) throw new Error("Invalid response structure");
      setNewAdvertisedId(typeof packageId === "string" ? packageId : String(packageId));
      toast.success("Package ID generated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate Package ID");
    } finally {
      setGenerateIdLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (packageDetail?.advertisedId) {
      navigator.clipboard
        .writeText(packageDetail.advertisedId)
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => toast.error("Failed to copy!"));
    }
  };

  if (!packageDetail?.advertisedId) {
    return null;
  }

  const isMetrc = packageDetail?.source === "METRC";

  return (
    <>
      <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 p-3 ring-1 ring-blue-200 dark:from-blue-950/30 dark:to-sky-950/30 dark:ring-blue-900">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Package ID</span>
          <Badge
            className={
              isMetrc
                ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
            }
          >
            {isMetrc ? "METRC" : "Regular"}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            title="Click to check for duplicate package IDs"
            onClick={handlePackageIdClick}
            className={`flex-1 text-left font-mono text-[15px] font-bold tracking-wide break-all text-blue-600 dark:text-blue-400 ${duplicateCheckLoading ? "opacity-60" : ""}`}
          >
            {packageDetail.advertisedId}
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard} title="Copy Package ID">
              <Copy className="size-3.5" />
              Copy
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setNewAdvertisedId("");
                setChangeIdError("");
                setChangeIdDrawerOpen(true);
              }}
              title="Change Package ID"
            >
              <Pencil className="size-3.5" />
              Change ID
            </Button>
          </div>
        </div>
        {duplicateIdWarning && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-blue-200 pt-2.5 dark:border-blue-900">
            <div className="flex items-center gap-1.5 text-[12.5px] text-amber-800 dark:text-amber-400">
              <TriangleAlert className="size-3.5 text-amber-500" />
              {duplicateIdWarning}
            </div>
            <button
              type="button"
              onClick={() => setDuplicateIdWarning("")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <Drawer
        open={changeIdDrawerOpen}
        onClose={() => {
          setChangeIdDrawerOpen(false);
          setNewAdvertisedId("");
          setChangeIdError("");
        }}
        side="right"
        size={480}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-base font-semibold">Change Package ID</h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setChangeIdDrawerOpen(false);
                setNewAdvertisedId("");
                setChangeIdError("");
              }}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 p-3 ring-1 ring-blue-200 dark:from-blue-950/30 dark:to-sky-950/30 dark:ring-blue-900">
              <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Current Package ID
              </p>
              <p className="font-mono text-base font-bold tracking-wide text-blue-600 dark:text-blue-400">
                {packageDetail.advertisedId}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">New Package ID</label>
                <Button size="sm" onClick={handleGeneratePackageId} disabled={generateIdLoading}>
                  {generateIdLoading ? "Generating..." : "Generate ID"}
                </Button>
              </div>
              <Input
                placeholder="Scan, enter, or generate a new package ID"
                value={newAdvertisedId}
                onChange={(e) => {
                  setNewAdvertisedId(e.target.value);
                  setChangeIdError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleChangePackageId();
                }}
                autoFocus
              />
            </div>

            {changeIdError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive dark:bg-destructive/20">
                {changeIdError}
              </div>
            )}

            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              This action cannot be undone. Make sure the new ID is correct before confirming.
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-4">
            <Button
              variant="outline"
              onClick={() => {
                setChangeIdDrawerOpen(false);
                setNewAdvertisedId("");
                setChangeIdError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePackageId} disabled={changeIdLoading}>
              {changeIdLoading ? "Checking..." : "Change ID"}
            </Button>
          </div>
        </div>
      </Drawer>

      <AlertDialog open={confirmChangeOpen} onOpenChange={setConfirmChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the Package ID to &quot;{newAdvertisedId.trim()}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={changeIdLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitChangePackageId} disabled={changeIdLoading}>
              {changeIdLoading ? "Changing..." : "Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
