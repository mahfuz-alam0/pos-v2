"use client";

import { useEffect, useState } from "react";

import { useShop } from "@/context/shop-context";
import { fetchProductsInLiveSession } from "@/services/liveInventory/productsInLiveSession";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductsInvolvedInSessionDetailsProps {
  sessionData: any;
  onViewOperations: (productId: string | number, productName: string) => void;
}

const STATUS_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
  Approved: "default",
  Rejected: "destructive",
  "Partially Approved": "secondary",
  "Submitted For Approval": "secondary",
  "Count In Progress": "secondary",
  "Yet To Start": "secondary",
};

export default function ProductsInvolvedInSessionDetails({
  sessionData,
  onViewOperations,
}: ProductsInvolvedInSessionDetailsProps) {
  const { shopId } = useShop();
  const [productsInLiveSession, setProductsInLiveSession] = useState<(string | number)[]>([]);

  useEffect(() => {
    if (!shopId) return;
    fetchProductsInLiveSession(shopId)
      .then((res) => setProductsInLiveSession(res?.data ?? []))
      .catch(() => {});
  }, [shopId]);

  const getStatus = (productId: string | number) => {
    if (sessionData?.approvedProductIds?.includes(productId)) return "Approved";
    if (sessionData?.partiallyApprovedProductIds?.includes(productId)) return "Partially Approved";
    if (sessionData?.rejectedProductIds?.includes(productId)) return "Rejected";
    if (sessionData?.submittedProductIds?.includes(productId)) return "Submitted For Approval";
    if (productsInLiveSession.includes(productId)) return "Count In Progress";
    return "Yet To Start";
  };

  const rows = (sessionData?.associatedProducts ?? []).map((product: any) => ({
    productId: product.id,
    productName: product.name,
    countStatus: getStatus(product.id),
  }));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row: any) => (
          <TableRow key={row.productId}>
            <TableCell>{row.productName}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[row.countStatus] ?? "secondary"}>{row.countStatus}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                disabled={row.countStatus !== "Submitted For Approval"}
                onClick={() => onViewOperations(row.productId, row.productName)}
              >
                View Operations
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
