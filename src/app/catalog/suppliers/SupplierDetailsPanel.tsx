"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchSingleSupplier } from "@/services/suppliers/getSingle";
import { fetchSupplierTypes } from "@/services/supplierTypes/list";
import { fetchMetrcTransfersList } from "@/services/metrcTransfers/list";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SupplierRow, SupplierTypeOption } from "./types";

interface MetrcTransferRow {
  id: string | number;
  metrcId?: string | number;
  supplierName?: string;
  supplierLicense?: string;
  isIncoming?: boolean;
}

interface SupplierDetailsPanelProps {
  supplierId: string | number;
  onClose: () => void;
  onEdit: () => void;
}

export default function SupplierDetailsPanel({ supplierId, onClose, onEdit }: SupplierDetailsPanelProps) {
  const { shopId } = useShop();
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [supplierTypes, setSupplierTypes] = useState<SupplierTypeOption[]>([]);

  const [transfers, setTransfers] = useState<MetrcTransferRow[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);

  useEffect(() => {
    fetchSupplierTypes().then((res) => setSupplierTypes(res?.data ?? []));
  }, []);

  useEffect(() => {
    if (!supplierId) return;
    setLoading(true);
    fetchSingleSupplier(supplierId)
      .then((res) => setSupplier(res?.data ?? null))
      .catch(() => toast.error("Failed to load supplier details"))
      .finally(() => setLoading(false));
  }, [supplierId]);

  useEffect(() => {
    if (!supplier?.license || !shopId) return;
    setTransfersLoading(true);
    fetchMetrcTransfersList(shopId, { limit: 30, page: 1, supplierLicense: supplier.license })
      .then((res) => setTransfers(res?.data ?? []))
      .catch(() => toast.error("Failed to load transfer history"))
      .finally(() => setTransfersLoading(false));
  }, [supplier?.license, shopId]);

  const supplierTypeName =
    supplierTypes.find((t) => String(t.id) === String(supplier?.supplierTypeId))?.name || "-";

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Vendor Details</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !supplier ? (
            <p className="py-4 text-sm text-muted-foreground">Supplier not found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {supplier.logo && (
                <img
                  src={supplier.logo}
                  alt={supplier.name}
                  className="size-16 rounded-lg object-cover ring-1 ring-foreground/10"
                />
              )}
              {[
                ["Supplier Name", supplier.name],
                ["Supplier Type", supplierTypeName],
                ["License Number", supplier.license],
                ["UBI", supplier.ubi],
                ["Email Address", supplier.email],
                ["Country", supplier.locationDetails?.country],
                ["Phone Number", supplier.phone],
                ["Description", supplier.description],
                ["Street", supplier.locationDetails?.streetAddress],
                ["City", supplier.locationDetails?.city],
                ["State", supplier.locationDetails?.state],
                ["Zip", supplier.locationDetails?.zipCode],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}:</span>
                  <span className="flex-1 text-sm font-medium">{value || "N/A"}</span>
                </div>
              ))}

              {supplier.documentLinks && supplier.documentLinks.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">Documents:</span>
                  {supplier.documentLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Document {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Transfer Details</h2>
        </div>
        <div className="h-px bg-border" />

        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Transfer ID</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfersLoading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={2}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!transfersLoading && transfers.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                  No transfers available.
                </TableCell>
              </TableRow>
            )}
            {!transfersLoading &&
              transfers.map((t, i) => (
                <TableRow
                  key={t.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>{t.metrcId ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={t.isIncoming ? "default" : "secondary"}>
                      {t.isIncoming ? "Incoming" : "Outgoing"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
