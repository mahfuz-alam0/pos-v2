"use client";

import { useEffect, useState } from "react";
import AnimatedDrawer from "@/components/ui/AnimatedDrawer";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
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
export default function CustomerDetailDrawer({ open, onClose, customerId }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AnimatedDrawer open={open} onClose={onClose} placement="right" width={720} title="Customer Details">
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
              </div>
            </div>
          </div>

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="top-products">Top Products</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
              <TabsTrigger value="returns">Returns</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="store-credits">Store Credits</TabsTrigger>
            </TabsList>

            <TabsContent value="notes">
              <NotesSection customerId={customerId} />
            </TabsContent>
            <TabsContent value="top-products">
              <TopProductsSection customerId={customerId} />
            </TabsContent>
            <TabsContent value="orders">
              <OrderHistorySection customerId={customerId} />
            </TabsContent>
            <TabsContent value="returns">
              <ReturnsSection customerId={customerId} />
            </TabsContent>
            <TabsContent value="loyalty">
              <LoyaltySection customerId={customerId} />
            </TabsContent>
            <TabsContent value="store-credits">
              <StoreCreditsSection customerId={customerId} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AnimatedDrawer>
  );
}
