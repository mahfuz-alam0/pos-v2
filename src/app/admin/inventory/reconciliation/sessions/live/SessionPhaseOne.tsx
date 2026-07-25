"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchSingleSession } from "@/services/liveInventory/getSingleSession";
import { connectToSocket } from "@/lib/socket";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CountedTable from "./CountedTable";
import ProductsInvolvedInLiveSession from "./ProductsInvolvedInLiveSession";

interface SessionPhaseOneProps {
  setVisible: (v: boolean) => void;
  sessionId: string | null;
  countSession: boolean;
  setCountSession: (v: boolean) => void;
  setSessionData: (v: any) => void;
  sessionData: any;
  onButtonStatesChange?: (states: { showReasonColumn: boolean; isSaving: boolean }) => void;
  onButtonHandlersChange?: (handlers: {
    handleNextClick: (() => void) | null;
    handleSubmit: (() => void) | null;
    handleBackClick: (() => void) | null;
  }) => void;
}

export default function SessionPhaseOne({
  setVisible,
  sessionId,
  countSession,
  setCountSession,
  setSessionData,
  sessionData,
  onButtonStatesChange,
  onButtonHandlersChange,
}: SessionPhaseOneProps) {
  const { shopId } = useShop();
  const [productName, setProductName] = useState("");
  const [countingMode, setCountingMode] = useState(sessionData?.countMethod || "EITHER");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const socketRef = useRef<ReturnType<typeof connectToSocket>>(null);

  const refreshSessionData = async () => {
    if (!sessionId || !shopId) return;
    setIsRefreshing(true);
    try {
      const res = await fetchSingleSession(sessionId, shopId);
      if (res?.data?.session) {
        setSessionData(res.data.session);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Error refreshing session data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (sessionData?.countMethod) setCountingMode(sessionData.countMethod);
  }, [sessionData]);

  useEffect(() => {
    if (!shopId) return;
    socketRef.current = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/live-count-session`, shopId });
    socketRef.current?.on("liveCountSessionTerminated", (data: any) => {
      if (sessionId === data.sessionId) {
        toast.warning("The live count session has been completed.");
        setCountSession(false);
      }
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [shopId, sessionId, setCountSession]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Session ID #{sessionData?.advertisedId}</h3>
          <p className="mt-1 text-sm">
            <span className="font-semibold">Product Name: </span>
            {productName || "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Counting Mode:</span>
          <Select value={countingMode} onValueChange={setCountingMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EITHER">Either</SelectItem>
              <SelectItem value="SCAN">Scan</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {countSession ? (
        <CountedTable
          setProductName={setProductName}
          sessionData={sessionData}
          setCountSession={setCountSession}
          countingMode={countingMode}
          onButtonStatesChange={onButtonStatesChange}
          onButtonHandlersChange={onButtonHandlersChange}
          onSessionRefresh={refreshSessionData}
          isNotLive={sessionData?.isNotLive}
        />
      ) : isRefreshing ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p>Updating session data...</p>
          </div>
        </div>
      ) : (
        <ProductsInvolvedInLiveSession
          key={refreshKey}
          setVisible={setVisible}
          sessionData={sessionData}
          setCountSession={setCountSession}
        />
      )}
    </div>
  );
}
