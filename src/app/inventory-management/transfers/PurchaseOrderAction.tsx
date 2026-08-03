"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Drawer from "@/components/ui/Drawer";
import { useShop } from "@/context/shop-context";
import { checkPurchaseOrderByTransfer } from "@/services/purchaseOrders/checkByTransfer";

export default function PurchaseOrderAction({ transferId }: { transferId?: string | number }) {
  const { shopId } = useShop();
  const [po, setPo] = useState<any>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!transferId || !shopId) return;
    checkPurchaseOrderByTransfer(transferId, shopId)
      .then((res) => setPo(res?.data ?? null))
      .catch(() => setPo(null));
  }, [transferId, shopId]);

  if (!po) return null;

  const subtotal = (po.lineItems ?? []).reduce(
    (sum: number, item: any) => sum + (item.costPerUnit ?? 0) * (item.orderedQty ?? 0),
    0
  );
  const shippingFee = po.shippingFee ?? 0;
  const total = po.total ?? subtotal + shippingFee;
  const amountPaid = po.amountPaid ?? (po.payments ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
  const outstanding = po.outstandingBalance ?? total - amountPaid;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        View PO
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} side="right" size={480}>
        <div className="flex h-full flex-col overflow-y-auto p-5">
          <div className="mb-4 flex gap-2">
            <Badge variant={po.status === "OPEN" ? "default" : "secondary"}>{po.status}</Badge>
            <Badge
              variant={po.paymentStatus === "PAID" ? "default" : po.paymentStatus === "PARTIAL" ? "secondary" : "destructive"}
            >
              {po.paymentStatus}
            </Badge>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-0 text-sm text-muted-foreground">Supplier</p>
              <p className="mb-0 font-medium">{po.supplierNameSnapshot || "-"}</p>
            </div>
            {po.metrcId && (
              <div>
                <p className="mb-0 text-sm text-muted-foreground">Transfer ID</p>
                <p className="mb-0 font-medium">{po.metrcId}</p>
              </div>
            )}
            {po.createdAt && (
              <div>
                <p className="mb-0 text-sm text-muted-foreground">Created</p>
                <p className="mb-0 font-medium">{new Date(po.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {po.paymentTerms && (
              <div>
                <p className="mb-0 text-sm text-muted-foreground">Payment Terms</p>
                <p className="mb-0 font-medium">{po.paymentTerms}</p>
              </div>
            )}
            {po.expectedAt && (
              <div>
                <p className="mb-0 text-sm text-muted-foreground">Expected Date</p>
                <p className="mb-0 font-medium">{new Date(po.expectedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="mb-4 rounded-md bg-muted/50 p-3">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {shippingFee > 0 && (
              <div className="flex justify-between py-1 text-sm">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span>${shippingFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 font-medium">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span>${amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 font-medium">
              <span>Outstanding</span>
              <span>${outstanding.toFixed(2)}</span>
            </div>
          </div>

          {po.notes && (
            <div className="mb-4">
              <p className="mb-0 text-sm text-muted-foreground">Notes</p>
              <p className="mb-0 font-medium">{po.notes}</p>
            </div>
          )}

          {po.payments?.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 font-medium">Payments</p>
              {po.payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <p className="text-sm font-medium">${payment.amount?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.method} · {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  {payment.notes && <p className="text-xs text-muted-foreground">{payment.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {po.closedAt && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Closed At</p>
              <p className="text-sm">{new Date(po.closedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
