"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  IdCard,
  Store,
  Tag as TagIcon,
  User,
  X,
} from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchPurchaseOrder } from "@/services/purchaseOrders/get";
import { addPaymentToPurchaseOrder } from "@/services/purchaseOrders/addPayment";
import { closePurchaseOrder } from "@/services/purchaseOrders/close";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import EditLineItemDialog from "./EditLineItemDialog";
import ProductHistoryDialog from "./ProductHistoryDialog";
import type { PurchaseOrderDetailData, PurchaseOrderLineItem, PaymentMethod } from "./types";

const PAYMENT_STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PAID: "default",
  PARTIAL: "secondary",
  UNPAID: "destructive",
};

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CHECK", "BANK_TRANSFER", "CREDIT"];

function fmtDate(value?: string, withTime = false) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function lineItemTotal(item: PurchaseOrderLineItem) {
  return item.total ?? item.lineTotal ?? item.totalCost ?? (item.costPerUnit ?? 0) * (item.orderedQty ?? 0);
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className={`font-mono text-lg font-bold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

export default function PurchaseOrderDetailPanel({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { shopId } = useShop();
  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState<PurchaseOrderDetailData | null>(null);
  const [closingPo, setClosingPo] = useState(false);

  const [editingLineItem, setEditingLineItem] = useState<PurchaseOrderLineItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ productId: string; productName?: string } | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  const fetchPo = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchPurchaseOrder(id, shopId);
      setPo(res?.data ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && shopId) fetchPo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shopId]);

  const handleAddPayment = async () => {
    if (!shopId || !po) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.warning("Enter a valid payment amount");
      return;
    }
    if (!paymentMethod) {
      toast.warning("Select a payment method");
      return;
    }
    setAddingPayment(true);
    try {
      await addPaymentToPurchaseOrder(id, shopId, { amount, method: paymentMethod, notes: paymentNotes || undefined });
      toast.success("Payment added");
      setPaymentAmount("");
      setPaymentMethod(null);
      setPaymentNotes("");
      await fetchPo();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add payment");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleClosePo = async () => {
    if (!shopId) return;
    setClosingPo(true);
    try {
      await closePurchaseOrder(id, shopId);
      toast.success("Purchase order closed");
      await fetchPo();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to close purchase order");
    } finally {
      setClosingPo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex w-1/3 flex-col gap-4 rounded-xl p-5 ring-1 ring-foreground/10">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex w-1/3 flex-col items-center justify-center gap-3 rounded-xl p-10 ring-1 ring-foreground/10">
        <FileText className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Purchase order not found.</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  const lineItemsTotal = (po.lineItems ?? []).reduce((sum, item) => sum + (lineItemTotal(item) ?? 0), 0);
  const grandTotal = po.total ?? lineItemsTotal + (po.shippingFee ?? 0);
  const totalPaid = po.amountPaid ?? (po.payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const outstanding = po.outstandingBalance ?? grandTotal - totalPaid;
  const paidPct = grandTotal > 0 ? Math.min((totalPaid / grandTotal) * 100, 100) : 0;
  const isOpen = po.status === "OPEN";

  return (
    <div className="flex w-1/3 flex-col gap-4 rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold">Purchase Order</h2>
            {po.externalInvoiceNumber && <span className="text-sm text-muted-foreground">#{po.externalInvoiceNumber}</span>}
            <Badge variant={po.status === "OPEN" ? "default" : "secondary"}>{po.status}</Badge>
            <Badge variant={PAYMENT_STATUS_BADGE[po.paymentStatus] ?? "outline"}>{po.paymentStatus}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {po.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" /> Created {fmtDate(po.createdAt)}
              </span>
            )}
            {po.createdByName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <User className="size-3" /> {po.createdByName}
                </span>
              </>
            )}
            {po.supplierNameSnapshot && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Store className="size-3" /> {po.supplierNameSnapshot}
                </span>
              </>
            )}
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={onClose} className="shrink-0">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <Tabs defaultValue="order-details">
          <TabsList>
            <TabsTrigger value="order-details">
              <FileText className="size-3.5" /> Order Details
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="size-3.5" /> Payments
              {(po.payments ?? []).length > 0 && (
                <span className="ml-1 rounded-full bg-green-100 px-1.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                  {po.payments!.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="order-details">
            <div className="flex flex-col gap-3 pt-3">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex min-w-40 items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/50">
                    <Store className="size-3 text-blue-600 dark:text-blue-400" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Vendor</p>
                    <p className="text-sm font-semibold">{po.supplierNameSnapshot || "-"}</p>
                    {po.supplierAddress && <p className="text-xs text-muted-foreground">{po.supplierAddress}</p>}
                    {po.supplierPhone && <p className="text-xs text-muted-foreground">{po.supplierPhone}</p>}
                  </div>
                </div>

                {po.shopName && (
                  <>
                    <div className="hidden self-stretch w-px bg-border md:block" />
                    <div className="flex min-w-35 items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-green-100 dark:bg-green-950/50">
                        <Building2 className="size-3 text-green-600 dark:text-green-400" />
                      </span>
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Dispensary</p>
                        <p className="text-sm font-semibold">{po.shopName}</p>
                        {po.shopAddress && <p className="text-xs text-muted-foreground">{po.shopAddress}</p>}
                      </div>
                    </div>
                  </>
                )}

                <div className="hidden self-stretch w-px bg-border md:block" />

                {po.createdAt && <MetaItem icon={<Calendar className="size-3" />} label="Date Created" value={fmtDate(po.createdAt, true)} />}
                {po.paymentTerms && <MetaItem icon={<TagIcon className="size-3" />} label="Payment Terms" value={po.paymentTerms} />}
                {po.paymentTermsDueDate && <MetaItem icon={<Calendar className="size-3" />} label="Terms Due" value={fmtDate(po.paymentTermsDueDate)} />}
                {po.expectedAt && <MetaItem icon={<Calendar className="size-3" />} label="Expected At" value={fmtDate(po.expectedAt)} />}
                {po.createdByName && <MetaItem icon={<User className="size-3" />} label="Created By" value={po.createdByName} />}
                {po.externalInvoiceNumber && <MetaItem icon={<FileText className="size-3" />} label="Invoice #" value={po.externalInvoiceNumber} />}
                {po.metrcId && <MetaItem icon={<IdCard className="size-3" />} label="METRC ID" value={po.metrcId} />}
              </div>

              {po.notes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/50">
                    <FileText className="size-3 text-blue-600 dark:text-blue-400" />
                  </span>
                  <p className="text-sm font-semibold">Line Items</p>
                  {(po.lineItems ?? []).length > 0 && (
                    <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      {po.lineItems!.length}
                    </span>
                  )}
                </div>

                <Table>
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow className="bg-muted/60">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Ordered</TableHead>
                      <TableHead className="text-center">Received</TableHead>
                      <TableHead className="text-right">Cost / Unit</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(po.lineItems ?? []).length === 0 && (
                      <TableRow className="border-b-0">
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          No line items
                        </TableCell>
                      </TableRow>
                    )}
                    {(po.lineItems ?? []).map((item, i) => {
                      const receivedCount = (po.receptions ?? []).filter((r) => r.lineItemId === item.id).length;
                      return (
                        <TableRow key={item.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                          <TableCell>
                            {item.productNameSnapshot ? (
                              <div>
                                <span className="font-medium">{item.productNameSnapshot}</span>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  {isOpen && (
                                    <button className="text-xs text-primary hover:underline" onClick={() => setEditingLineItem(item)}>
                                      Edit
                                    </button>
                                  )}
                                  {isOpen && item.productId && <span className="text-xs text-muted-foreground">·</span>}
                                  {item.productId && (
                                    <button
                                      className="text-xs text-primary hover:underline"
                                      onClick={() => setHistoryTarget({ productId: item.productId!, productName: item.productNameSnapshot })}
                                    >
                                      Pricing History
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">{item.orderedQty ?? "—"}</TableCell>
                          <TableCell className="text-center font-mono">{receivedCount || (item.receivedQty ?? "—")}</TableCell>
                          <TableCell className="text-right font-mono">${(item.costPerUnit ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">${(lineItemTotal(item) ?? 0).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex justify-end border-t border-border bg-muted/30 px-4 py-3">
                  <div className="space-y-1 text-right">
                    <div className="flex justify-between gap-12 text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono">${lineItemsTotal.toFixed(2)}</span>
                    </div>
                    {(po.shippingFee ?? 0) > 0 && (
                      <div className="flex justify-between gap-12 text-sm text-muted-foreground">
                        <span>Shipping Fee</span>
                        <span className="font-mono">${(po.shippingFee ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between gap-12 font-bold">
                      <span>Grand Total</span>
                      <span className="font-mono">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="flex flex-col gap-3 pt-3">
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Grand Total" value={`$${grandTotal.toFixed(2)}`} />
                <SummaryCard label="Paid" value={`$${totalPaid.toFixed(2)}`} className="text-green-600 dark:text-green-400" />
                <SummaryCard
                  label="Outstanding"
                  value={`$${Math.max(outstanding, 0).toFixed(2)}`}
                  className={outstanding > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}
                />
              </div>

              {grandTotal > 0 && (
                <div className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Payment Progress</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        paidPct >= 100
                          ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                          : paidPct > 0
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                          : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                      }`}
                    >
                      {paidPct.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={paidPct}>
                    <ProgressTrack>
                      <ProgressIndicator
                        className={paidPct >= 100 ? "bg-green-600" : paidPct > 0 ? "bg-blue-600" : "bg-red-500"}
                      />
                    </ProgressTrack>
                  </Progress>
                </div>
              )}

              {(po.payments ?? []).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Payment History</p>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <Table>
                      <TableHeader className="[&_tr]:border-b-0">
                        <TableRow className="bg-muted/60">
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.payments!.map((payment, i) => (
                          <TableRow key={payment.id} className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}>
                            <TableCell className="text-xs text-muted-foreground">{fmtDate(payment.paidAt)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.method?.replace("_", " ")}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">${(payment.amount ?? 0).toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{payment.notes || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-950/50">
                      <CreditCard className="size-3 text-blue-600 dark:text-blue-400" />
                    </span>
                    <p className="text-sm font-semibold">Add Payment</p>
                    {outstanding > 0 && (
                      <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                        Outstanding: ${Math.max(outstanding, 0).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 px-4 py-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex w-37 flex-col gap-1">
                        <label className="text-sm font-medium">Amount</label>
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          placeholder="0.00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>

                      <div className="flex w-42 flex-col gap-1">
                        <label className="text-sm font-medium">Payment Method</label>
                        <Select
                          items={PAYMENT_METHODS.map((m) => ({ value: m, label: m.replace("_", " ") }))}
                          value={paymentMethod ?? undefined}
                          onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex min-w-40 flex-1 flex-col gap-1">
                        <label className="text-sm font-medium">Notes (optional)</label>
                        <Input placeholder="Add any payment notes…" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="flex items-center gap-2">
                      <Button onClick={handleAddPayment} disabled={addingPayment}>
                        {addingPayment ? "Recording..." : "Record Payment"}
                      </Button>
                      {outstanding > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setPaymentAmount(String(Math.max(outstanding, 0)))}>
                          Autofill outstanding amount
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="flex flex-col items-start gap-1.5 px-4 py-3">
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button variant="destructive" disabled={closingPo}>
                          {closingPo ? "Finalizing..." : "Finalize PO"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Close Purchase Order</AlertDialogTitle>
                          <AlertDialogDescription>
                            Once closed, no more payments or edits can be made. Continue?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClosePo}>Close PO</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <p className="text-xs text-muted-foreground">PO will no longer be editable</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EditLineItemDialog
        lineItem={editingLineItem}
        poId={id}
        shopId={shopId}
        onClose={() => setEditingLineItem(null)}
        onSaved={() => {
          setEditingLineItem(null);
          fetchPo();
          onChanged?.();
        }}
      />

      <ProductHistoryDialog
        open={!!historyTarget}
        productId={historyTarget?.productId}
        productName={historyTarget?.productName}
        shopId={po.shopId}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
