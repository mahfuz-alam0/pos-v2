"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCustomerName,
  getPreSaleLifecycle,
  getPreSalePaymentStatus,
  LIFECYCLE_BADGE,
  LIFECYCLE_ACTION_CLASS,
} from "./constants";

const SOURCE_BADGE_CLASS = {
  EXTERNAL: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  INTERNAL: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  WEEDMAPS: "border-transparent bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300",
  LEAFLY: "border-transparent bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

function rowFromPreSale(preSale) {
  const lifecycle = getPreSaleLifecycle(preSale);
  return {
    id: preSale.id,
    type: "presale",
    original: preSale,
    advertisedId: preSale.advertisedId,
    customerName: getCustomerName(preSale) || "Guest",
    source: preSale?.info?.source,
    deliveryMethod: preSale?.info?.saleData?.deliveryMethod,
    lifecycle,
    paymentStatus: getPreSalePaymentStatus(preSale),
    total: preSale?.info?.saleData?.finalPayable,
  };
}

function rowFromSale(sale) {
  return {
    id: sale.id,
    type: "sale",
    original: sale,
    advertisedId: sale.advertisedId,
    customerName: `${sale?.customer?.firstName || ""} ${sale?.customer?.lastName || ""}`.trim() || "Guest",
    source: sale.source,
    deliveryMethod: sale.deliveryMethod,
    lifecycle: sale?.status?.statusId,
    paymentStatus: sale.paymentStatus,
    total: sale.finalPayable,
  };
}

export default function OrderAheadTable({ preSales, sales, loading, onConfirm, onCancel, onAssignPackages }) {
  const rows = [...preSales.map(rowFromPreSale), ...sales.map(rowFromSale)];

  return (
    <div className="w-full overflow-x-auto rounded-xl ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Lifecycle</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-b-0">
                {Array.from({ length: 8 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && rows.length === 0 && (
            <TableRow className="border-b-0">
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No orders found.
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            rows.map((row, i) => {
              const badge = LIFECYCLE_BADGE[row.lifecycle];
              const actionClass = LIFECYCLE_ACTION_CLASS[row.lifecycle] || "";
              return (
                <TableRow
                  key={row.id}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${
                    i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : "bg-background"
                  }`}
                >
                  <TableCell className="font-medium">#{row.advertisedId}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>
                    <Badge className={SOURCE_BADGE_CLASS[row.source] || ""} variant={SOURCE_BADGE_CLASS[row.source] ? undefined : "outline"}>
                      {row.source}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.deliveryMethod}</TableCell>
                  <TableCell>
                    {badge && <Badge className={badge.className}>{badge.label}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge className={row.paymentStatus === "PAID_IN_FULL" ? "bg-emerald-600 text-white" : "bg-amber-400 text-black"}>
                      {row.paymentStatus === "PAID_IN_FULL" ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.total != null ? `$${Number(row.total).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.type === "presale" && row.lifecycle === "NEW" && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" className={actionClass} onClick={() => onConfirm(row.original)}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => onCancel(row.original)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                    {row.type === "presale" && row.lifecycle === "CONFIRMED" && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" className={actionClass} onClick={() => onAssignPackages(row.original)}>
                          Assign Packages
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => onCancel(row.original)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
