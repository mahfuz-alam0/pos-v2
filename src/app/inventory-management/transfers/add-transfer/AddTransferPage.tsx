"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import WithinLocationTransferForm from "./WithinLocationTransferForm";
import ShopTransferForm from "./ShopTransferForm";
import SupplierTransferForm from "./SupplierTransferForm";
import type { TransferTab } from "../types";

const TRANSFER_TYPE_LABELS: Record<TransferTab, string> = {
  "within-storage-locations": "Within Storage Locations",
  "with-in-shops": "Within Shops",
  "supplier-specific": "Supplier Specific",
};

const VALID_TYPES: TransferTab[] = ["within-storage-locations", "with-in-shops", "supplier-specific"];

export default function AddTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawType = searchParams.get("transferType");
  const transferType: TransferTab = VALID_TYPES.includes(rawType as TransferTab)
    ? (rawType as TransferTab)
    : "within-storage-locations";

  const handleTypeChange = (value: string) => {
    router.push(`/inventory-management/transfers/add-transfer?transferType=${value}`);
  };

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl bg-card shadow-md">
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/inventory-management" className="text-muted-foreground">
                  Inventory Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/inventory-management/transfers" />} className="text-muted-foreground">
                  Transfers
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-normal text-primary">Add Transfer</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Select
            items={Object.entries(TRANSFER_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            value={transferType}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="h-10! w-56">
              <SelectValue placeholder="Select transfer type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRANSFER_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {transferType === "within-storage-locations" && <WithinLocationTransferForm />}
          {transferType === "with-in-shops" && <ShopTransferForm />}
          {transferType === "supplier-specific" && <SupplierTransferForm />}
        </div>
      </div>
    </div>
  );
}
