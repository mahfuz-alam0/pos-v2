"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import AnimatedDrawer from "@/components/ui/AnimatedDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import { addCustomerToQueue } from "@/services/sales/addCustomerToQueue";
import {
  approveCustomerGroupRemarks,
  approveCustomerTypeRemarks,
  rejectCustomerGroupRemarks,
  rejectCustomerTypeRemarks,
} from "@/services/customers/remarksApproval";
import ActivityLogDrawer from "@/components/admin/ActivityLogDrawer";
import NotesSection from "./NotesSection";
import TopProductsSection from "./TopProductsSection";
import OrderHistorySection from "./OrderHistorySection";
import ReturnsSection from "./ReturnsSection";
import LoyaltySection from "./LoyaltySection";
import StoreCreditsSection from "./StoreCreditsSection";

function calculateAge(dob) {
  if (!dob || isNaN(Date.parse(dob))) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

// Full customer detail view opened from a Front Desk queue card. Ported from
// the old app's front-desk drawer (customer info + notes/top-products/order
// history/returns/loyalty/store-credits), rebuilt against this project's
// existing services and shadcn primitives.
export default function CustomerDetailDrawer({ open, onClose, customerId, checkedIn = false, onCheckedIn = undefined, mode = "drawer" }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [remarksBusy, setRemarksBusy] = useState(false);

  const refetch = () => {
    if (!customerId) return;
    getSingleCustomer(customerId).then((res) => setCustomer(res?.data?.data?.customer || null));
  };

  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    getSingleCustomer(customerId)
      .then((res) => setCustomer(res?.data?.data?.customer || null))
      .finally(() => setLoading(false));
  }, [open, customerId]);

  const age = calculateAge(customer?.dob || customer?.dateOfBirth);
  const isMedExpired =
    customer?.mjMedicalLicenseExpiresAt && customer?.mjMedicalLicense
      ? new Date(customer.mjMedicalLicenseExpiresAt) < new Date()
      : false;

  const hasPendingRemarks =
    customer?.isCustomerGroupsRemarksPending || customer?.isCustomerTypeRemarksPending;

  const handleCheckIn = async () => {
    if (!customerId) return;
    setCheckingIn(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      await addCustomerToQueue({ shopId, customerId, isAnonymous: false });
      toast.success("Customer added to queue");
      onCheckedIn?.(customerId);
    } catch (error: any) {
      toast.error(error?.error || error?.message || "Error adding customer to queue");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleApproveGroup = async () => {
    setRemarksBusy(true);
    try {
      await approveCustomerGroupRemarks(customerId);
      toast.success("Group change approved");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve group change");
    } finally {
      setRemarksBusy(false);
    }
  };

  const handleRejectGroup = async () => {
    setRemarksBusy(true);
    try {
      await rejectCustomerGroupRemarks(customerId);
      toast.success("Group change rejected");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject group change");
    } finally {
      setRemarksBusy(false);
    }
  };

  const handleApproveType = async () => {
    setRemarksBusy(true);
    try {
      await approveCustomerTypeRemarks(customerId);
      toast.success("Type change approved");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve type change");
    } finally {
      setRemarksBusy(false);
    }
  };

  const handleRejectType = async () => {
    setRemarksBusy(true);
    try {
      await rejectCustomerTypeRemarks(customerId);
      toast.success("Type change rejected");
      refetch();
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject type change");
    } finally {
      setRemarksBusy(false);
    }
  };

  const body = (
    <>
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : !customer ? (
        <div className="py-16 text-center text-muted-foreground">Customer not found</div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            {customer.avatarUrl ? (
              <img src={customer.avatarUrl} alt="" className="size-16 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-on-primary">
                {(customer.firstName || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">
                {customer.firstName} {customer.lastName}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                {age && <span>{age} y/o</span>}
                {customer.phone && <span>· {customer.phone}</span>}
                {customer.email && <span>· {customer.email}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {customer.customerType && <Badge variant="outline">{customer.customerType}</Badge>}
                {customer.drivingLicense && <Badge variant="secondary">DL: {customer.drivingLicense}</Badge>}
                {customer.mjMedicalLicense && (
                  <Badge variant={isMedExpired ? "destructive" : "secondary"}>
                    Med ID {isMedExpired ? "(Expired)" : ""}
                  </Badge>
                )}
                {hasPendingRemarks && <Badge variant="destructive">Pending</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setActivityOpen(true)}>
                Activity
              </Button>
              <Button size="sm" disabled={checkedIn || checkingIn} onClick={handleCheckIn}>
                {checkedIn ? "Checked In" : checkingIn ? "Checking In…" : "Check In"}
              </Button>
            </div>
          </div>

          {hasPendingRemarks && (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Action Required — Pending Requests
              </div>

              {customer.isCustomerGroupsRemarksPending && (
                <div className="space-y-1.5 text-sm">
                  <div className="font-medium">Group Change Request</div>
                  <div className="text-muted-foreground">
                    Current: {customer.customerGroups?.map((g) => g.name).join(", ") || "None"}
                  </div>
                  <div className="text-muted-foreground">
                    Requested: {customer.remarkedCustomerGroups?.map((g) => g.name).join(", ") || "None"}
                  </div>
                  {customer.customerGroupsRemarks && (
                    <div className="rounded bg-muted/60 p-2 text-xs italic">
                      "{customer.customerGroupsRemarks}"
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" disabled={remarksBusy} onClick={handleApproveGroup}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={remarksBusy} onClick={handleRejectGroup}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {customer.isCustomerTypeRemarksPending && (
                <div className="space-y-1.5 text-sm">
                  <div className="font-medium">Type Change Request</div>
                  <div className="text-muted-foreground">Current: {customer.customerType?.name || customer.customerType || "None"}</div>
                  <div className="text-muted-foreground">
                    Requested: {customer.remarkedCustomerType?.name || "None"}
                  </div>
                  {customer.customerTypeRemarks && (
                    <div className="rounded bg-muted/60 p-2 text-xs italic">"{customer.customerTypeRemarks}"</div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" disabled={remarksBusy} onClick={handleApproveType}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={remarksBusy} onClick={handleRejectType}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="notes">
            <TabsList variant="line" className="w-full justify-start gap-4 border-b border-border">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="top-products">Top Products</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="store-credits">Store Credits</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="pt-4">
              <NotesSection customerId={customerId} />
            </TabsContent>
            <TabsContent value="top-products" className="pt-4">
              <TopProductsSection customerId={customerId} />
            </TabsContent>
            <TabsContent value="orders" className="pt-4">
              <OrderHistorySection customerId={customerId} />
            </TabsContent>
            <TabsContent value="returns" className="pt-4">
              <ReturnsSection customerId={customerId} />
            </TabsContent>
            <TabsContent value="loyalty" className="pt-4">
              <LoyaltySection customerId={customerId} />
            </TabsContent>
            <TabsContent value="store-credits" className="pt-4">
              <StoreCreditsSection customerId={customerId} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <ActivityLogDrawer
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        domain="CUSTOMER"
        targetId={customerId}
      />
    </>
  );

  if (mode === "inline") {
    if (!open) return null;
    return (
      <div className="flex h-fit max-h-[calc(100vh-3rem)] w-full flex-col overflow-y-auto rounded-xl border border-border bg-component-bg shadow-sm">
        <div className="sticky top-0 z-1 flex items-center justify-between border-b border-border bg-component-bg px-6 py-4">
          <h3 className="m-0 text-base font-semibold text-text">Customer Details</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
          </Button>
        </div>
        <div className="px-7.5 py-5">{body}</div>
      </div>
    );
  }

  return (
    <AnimatedDrawer open={open} onClose={onClose} placement="right" width={720} title="Customer Details">
      {body}
    </AnimatedDrawer>
  );
}
