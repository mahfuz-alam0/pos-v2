"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { createLiveAuditSession } from "@/services/auditSessions/createLiveAuditSession";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditPackageRow } from "./types";

interface StartLiveSessionDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedRows: AuditPackageRow[];
  locationMap: Record<string, string>;
  locationId?: string | null;
  onCreated: () => void;
}

export default function StartLiveSessionDrawer({
  open,
  onClose,
  selectedRows,
  locationMap,
  locationId,
  onCreated,
}: StartLiveSessionDrawerProps) {
  const router = useRouter();
  const { shopId } = useShop();
  const [isCreating, setIsCreating] = useState(false);

  const uniquePackageCount = new Set(selectedRows.map((r) => r.id)).size;

  const handleStart = async () => {
    setIsCreating(true);
    try {
      const uniquePackageIds = [...new Set(selectedRows.map((r) => r.id))];
      const res = await createLiveAuditSession({
        shopId: shopId as string,
        packageIds: uniquePackageIds,
        ...(locationId ? { storageLocationId: locationId } : {}),
      });

      toast.success("Live count session started!");
      onCreated();

      const createdSession = res?.data?.data?.session || res?.data?.data;
      if (createdSession?.id) {
        router.push(`/admin/inventory/audit/${createdSession.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to start session");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={600} zIndex={1000}>
      <div className="flex h-full flex-col">
        <div className="border-b p-5">
          <h2 className="text-base font-semibold">Start Live Count Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {uniquePackageCount} package{uniquePackageCount === 1 ? "" : "s"} selected
          </p>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Product</TableHead>
                  <TableHead>Package ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedRows.map((row, i) => (
                  <TableRow key={`${row.id}-${row.rowLocationId ?? i}`}>
                    <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
                    <TableCell className="font-mono text-xs">{row.advertisedId}</TableCell>
                    <TableCell>
                      {row.rowLocationId ? locationMap[row.rowLocationId] || row.rowLocationId : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.rowLocationQty ?? row.quantityLeft ?? 0} {row.uoMShortForm}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex gap-2 border-t p-5">
          <Button onClick={handleStart} disabled={selectedRows.length === 0 || isCreating}>
            {isCreating ? "Starting..." : "Start Live Count Session"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
