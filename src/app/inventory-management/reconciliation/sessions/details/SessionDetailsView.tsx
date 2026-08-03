"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchSingleSession } from "@/services/liveInventory/getSingleSession";

import ProductsInvolvedInSessionDetails from "./ProductsInvolvedInSessionDetails";
import ResolveSessionPanel from "./ResolveSessionPanel";

interface SessionDetailsViewProps {
  sessionId: string;
}

export default function SessionDetailsView({ sessionId }: SessionDetailsViewProps) {
  const { shopId } = useShop();
  const [sessionData, setSessionData] = useState<any>(null);
  const [resolveSession, setResolveSession] = useState(false);
  const [productId, setProductId] = useState<string | number | null>(null);
  const [productName, setProductName] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !shopId) return;
    fetchSingleSession(sessionId, shopId)
      .then((res) => setSessionData(res?.data?.session ?? null))
      .catch(() => toast.error("Failed to fetch session data"));
  }, [sessionId, shopId]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Session ID #{sessionData?.advertisedId}</h1>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Storage Location: </span>
          {sessionData?.storageLocation?.name}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">Assigned To: </span>
          {sessionData?.assignedTo?.name}
        </p>
        {resolveSession && (
          <p className="mt-1 text-sm">
            <span className="font-semibold">Product Name: </span>
            {productName}
          </p>
        )}
      </div>

      {resolveSession ? (
        <ResolveSessionPanel productId={productId} sessionData={sessionData} onBack={() => setResolveSession(false)} />
      ) : (
        <ProductsInvolvedInSessionDetails
          sessionData={sessionData}
          onViewOperations={(id, name) => {
            setProductId(id);
            setProductName(name);
            setResolveSession(true);
          }}
        />
      )}
    </div>
  );
}
