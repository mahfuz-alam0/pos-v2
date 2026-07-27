"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomerName, getPreSaleLifecycle, getPreSalePaymentStatus } from "./constants";

const LIFECYCLE_LABEL = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  PACKAGED_AND_READY: "Packaged & Ready",
  AWAITING_DRIVER: "Awaiting Driver",
  OUT_FOR_DELIVERY: "Out for Delivery",
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
        <TableHeader>
          <TableRow className="bg-muted/60">
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
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No orders found.
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">#{row.advertisedId}</TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.source}</Badge>
                </TableCell>
                <TableCell>{row.deliveryMethod}</TableCell>
                <TableCell>{LIFECYCLE_LABEL[row.lifecycle] || row.lifecycle}</TableCell>
                <TableCell>
                  <Badge variant={row.paymentStatus === "PAID_IN_FULL" ? "default" : "secondary"}>
                    {row.paymentStatus === "PAID_IN_FULL" ? "Paid" : "Unpaid"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {row.total != null ? `$${Number(row.total).toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {row.type === "presale" && row.lifecycle === "NEW" && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => onConfirm(row.original)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onCancel(row.original)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  {row.type === "presale" && row.lifecycle === "CONFIRMED" && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => onAssignPackages(row.original)}>
                        Assign Packages
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onCancel(row.original)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
