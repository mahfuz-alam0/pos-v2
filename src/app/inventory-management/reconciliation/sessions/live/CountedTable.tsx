"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, AlertTriangle } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { fetchLivePackagesList } from "@/services/liveInventory/livePackagesList";
import { updateFinalizedCount } from "@/services/liveInventory/updateFinalizedCount";
import { updateLiveEvents } from "@/services/liveInventory/updateLiveEvents";
import { submitLiveCountSession } from "@/services/liveInventory/submitSession";
import { createPackageAdjustment } from "@/services/packageAdjustments/create";
import { fetchMetrcAdjustmentReasons } from "@/services/metrc/adjustmentReasons";
import { connectToSocket } from "@/lib/socket";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LiveCountInput from "./LiveCountInput";
import QuestionPopover from "./QuestionPopover";

interface CountedTableProps {
  setProductName: (v: string) => void;
  sessionData: any;
  setCountSession: (v: boolean) => void;
  countingMode: string;
  onButtonStatesChange?: (states: { showReasonColumn: boolean; isSaving: boolean }) => void;
  onButtonHandlersChange?: (handlers: {
    handleNextClick: (() => void) | null;
    handleSubmit: (() => void) | null;
    handleBackClick: (() => void) | null;
  }) => void;
  onSessionRefresh?: () => Promise<void> | void;
  isNotLive?: boolean;
}

function isStockMatching(pkg: any) {
  return (pkg?.currentStock || 0) === (pkg?.finalizedCount || 0);
}

export default function CountedTable({
  setProductName,
  sessionData,
  setCountSession,
  countingMode,
  onButtonStatesChange,
  onButtonHandlersChange,
  onSessionRefresh,
  isNotLive,
}: CountedTableProps) {
  const { shopId } = useShop();

  const [livePackages, setLivePackages] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [showReasonColumn, setShowReasonColumn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, number>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [packageReasons, setPackageReasons] = useState<Record<string, string>>({});
  const [initiationReasonMetrc, setInitiationReasonMetrc] = useState<any[]>([]);
  const [successfulPackages, setSuccessfulPackages] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activityPopoverKey, setActivityPopoverKey] = useState<string | null>(null);
  const [errorConfirmOpen, setErrorConfirmOpen] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const socketRef = useRef<ReturnType<typeof connectToSocket>>(null);

  useEffect(() => {
    fetchMetrcAdjustmentReasons(shopId)
      .then((res) => setInitiationReasonMetrc(res?.data?.reasons ?? []))
      .catch(() => {});
  }, []);

  const fetchLivePackages = () => {
    const currentSession = sessionData || sessionInfo;
    if (!shopId || !currentSession?.id) return;
    fetchLivePackagesList(shopId, { sessionId: currentSession.id, shouldPopulateCurrentStock: true })
      .then((res) => {
        const packages = (res?.data?.packages ?? []).map((item: any) => ({ ...item, key: item.id }));
        setLivePackages(packages);
        setEvents(res?.data?.events ?? []);
        setSessionInfo(res?.data?.liveSession ?? null);
        setProductName(res?.data?.liveSession?.productName ?? "");
      })
      .catch((err) => console.error("Error fetching live packages:", err));
  };

  useEffect(() => {
    fetchLivePackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData]);

  useEffect(() => {
    const initial: Record<string, number> = {};
    livePackages.forEach((pkg) => {
      initial[pkg.key] = pkg.finalizedCount || 0;
    });
    setInputValues(initial);
  }, [livePackages]);

  useEffect(() => {
    onButtonStatesChange?.({ showReasonColumn, isSaving });
  }, [showReasonColumn, isSaving, onButtonStatesChange]);

  const handleNextClick = () => setShowReasonColumn(true);
  const handleBackClick = () => {
    if (showReasonColumn) setShowReasonColumn(false);
    else setCountSession(false);
  };

  const updateLiveCount = async (packageId: string, newCount: number) => {
    const res = await updateFinalizedCount({
      shopId,
      id: sessionInfo?.id,
      packageId,
      finalizedCount: newCount,
    });
    fetchLivePackages();
    return res;
  };

  const handleCountedStockChange = async (value: number, key: string) => {
    const newValue = Number.isNaN(value) ? 0 : Number(value);
    if (Number.isNaN(newValue) || newValue < 0) return;
    const pkg = livePackages.find((p) => p.key === key);
    if (!pkg) return;
    try {
      const res = await updateLiveCount(pkg.id.split(":")[1], newValue);
      if (res?.data?.success) toast.success("Count updated successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Error updating count");
    }
  };

  const handleDebouncedCountChange = (value: number, key: string) => {
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(async () => {
      try {
        setSavingStates((prev) => ({ ...prev, [key]: true }));
        setIsSaving(true);
        await handleCountedStockChange(value, key);
      } finally {
        setSavingStates((prev) => {
          const next = { ...prev, [key]: false };
          setIsSaving(Object.values(next).some(Boolean));
          return next;
        });
      }
    }, 1000);
  };

  const handleReasonChange = (value: string, packageId: string, isPlatformSource: boolean) => {
    setPackageReasons((prev) => ({
      ...prev,
      [packageId]: isPlatformSource
        ? value
        : initiationReasonMetrc.find((item) => item.platformId === value)?.Name ?? value,
    }));
  };

  const updateEventStatus = async (data: any) => {
    return updateLiveEvents({
      shopId,
      id: data.id,
      isResolved: data.isResolved,
      isTakenInConsideration: data.isTakenInConsideration,
      sessionId: sessionInfo?.id,
    });
  };

  const handleEventAction = async (event: any, isTakenInConsideration: boolean) => {
    const pkg = livePackages.find((p) => p.packageId === event.packageId);
    const res = await updateEventStatus({ id: event.id, isResolved: true, isTakenInConsideration });
    if (res?.data?.success && pkg) {
      try {
        const newCount = pkg.finalizedCount + (isTakenInConsideration ? 0 : event.operatedStockOnHold);
        const countRes = await updateLiveCount(pkg.id.split(":")[1], newCount);
        if (countRes?.data?.success) fetchLivePackages();
      } catch (err) {
        console.error("Error updating count:", err);
      }
    }
  };

  useEffect(() => {
    if (!shopId) return;
    socketRef.current = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/live-count-session`, shopId });
    socketRef.current?.on("packageEvent", () => fetchLivePackages());
    return () => {
      Object.values(debounceTimers.current).forEach((t) => clearTimeout(t));
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const submitSession = async () => {
    const currentSession = sessionData || sessionInfo;
    if (!currentSession?.id) {
      toast.error("Session data is not available. Please refresh and try again.");
      return false;
    }
    try {
      const res = await submitLiveCountSession({ shopId, sessionId: currentSession.id });
      if (res?.data?.success) {
        toast.success("Session has been successfully submitted");
        await onSessionRefresh?.();
        setCountSession(false);
        return true;
      }
      toast.error(res?.data?.message || "Failed to submit session");
      return false;
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
      return false;
    }
  };

  const handleSubmit = async () => {
    const currentSession = sessionData || sessionInfo;
    if (!currentSession?.id) {
      toast.error("Session data is not available. Please refresh and try again.");
      return;
    }
    try {
      const results = await Promise.all(
        livePackages.map(async (pkg) => {
          if (isStockMatching(pkg) || successfulPackages.has(pkg.packageId)) {
            return { success: true };
          }
          const isPlatformSource = pkg.source === "PLATFORM";
          const initiationReason = packageReasons[pkg.packageId] || "";
          const initiationReasonReferenceId = !isPlatformSource
            ? initiationReasonMetrc.find((item) => item.Name === initiationReason)?.platformId
            : null;

          const body = {
            shopId,
            initiationReason,
            packageId: pkg.packageId,
            storageLocationBreakdown: [
              { storageLocationId: pkg.storageLocationId, differenceCount: pkg.finalizedCount },
            ],
            shouldApproveRightAway: currentSession?.isManagerApprovalRequired !== true,
            initiationReasonReferenceId,
            originSessionId: currentSession?.id,
          };

          try {
            const res = await createPackageAdjustment(body);
            if (res?.data?.success) setSuccessfulPackages((prev) => new Set(prev).add(pkg.packageId));
            return { success: !!res?.data?.success };
          } catch (err: any) {
            setErrors((prev) => ({ ...prev, [pkg.packageId]: err?.message || "Failed to reconcile package" }));
            return { success: false };
          }
        })
      );

      const hasErrors = results.some((r) => !r.success);
      const hasSuccess = results.some((r) => r.success);

      if (hasErrors) {
        setErrorConfirmOpen(true);
        if (!hasSuccess) toast.error("No successful reconciliations to submit.");
      } else {
        await submitSession();
      }
    } catch (err) {
      toast.error("An error occurred during reconciliation. Please try again.");
    }
  };

  useEffect(() => {
    onButtonHandlersChange?.({ handleNextClick, handleSubmit, handleBackClick });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onButtonHandlersChange, livePackages, packageReasons, successfulPackages, sessionData, sessionInfo]);

  const activityForPackage = (packageId: string) => events.find((e) => e.packageId === packageId)?.events ?? [];

  return (
    <>
      {(sessionData || sessionInfo) && countingMode !== "MANUAL" && (
        <div className="mb-4">
          <LiveCountInput livePackages={livePackages} sessionInfo={sessionInfo} fetchLivePackages={fetchLivePackages} />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package Id</TableHead>
            <TableHead className="text-center">Starting Stock</TableHead>
            {showReasonColumn && <TableHead className="text-center">Current Stock</TableHead>}
            <TableHead className="text-center">Counted Stock</TableHead>
            {showReasonColumn && <TableHead className="text-center">Reason</TableHead>}
            {showReasonColumn && !isNotLive && <TableHead className="text-center">Events</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {livePackages.map((pkg) => {
            const matching = isStockMatching(pkg);
            const currentSession = sessionData || sessionInfo;
            const packageEvents = activityForPackage(pkg.packageId);
            const hasUnresolved = packageEvents.some((e: any) => !e.isResolved);
            const isSavingThis = savingStates[pkg.key];
            const currentValue = inputValues[pkg.key] ?? pkg.finalizedCount ?? 0;

            const updateValue = (v: number) => {
              setInputValues((prev) => ({ ...prev, [pkg.key]: v }));
              handleDebouncedCountChange(v, pkg.key);
            };

            return (
              <TableRow key={pkg.key} className={matching ? "bg-green-50 dark:bg-green-950/20" : ""}>
                <TableCell className="font-mono text-xs">{pkg.advertisedId}</TableCell>
                <TableCell className="relative text-center">
                  {currentSession?.isBlindCount ? (
                    <QuestionPopover data="The starting stock is blocked since it's a blind count." />
                  ) : (
                    pkg.startingCount
                  )}
                </TableCell>
                {showReasonColumn && <TableCell className="text-center">{pkg.currentStock || 0}</TableCell>}
                <TableCell className="text-center">
                  {showReasonColumn ? (
                    pkg.finalizedCount || 0
                  ) : countingMode === "SCAN" ? (
                    pkg.finalizedCount
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        disabled={isSavingThis}
                        onClick={() => updateValue(Math.max(0, currentValue - 1))}
                      >
                        -
                      </Button>
                      <Input
                        className="w-16 text-center"
                        type="number"
                        min={0}
                        value={currentValue}
                        disabled={isSavingThis}
                        onChange={(e) => updateValue(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                      />
                      <Button size="sm" disabled={isSavingThis} onClick={() => updateValue(currentValue + 1)}>
                        +
                      </Button>
                    </div>
                  )}
                </TableCell>
                {showReasonColumn && (
                  <TableCell className="text-center">
                    {matching ? (
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <Check className="size-4" /> No reconciliation needed
                      </div>
                    ) : pkg.source === "PLATFORM" ? (
                      <Textarea
                        rows={2}
                        placeholder="Enter your text here"
                        value={packageReasons[pkg.packageId] || ""}
                        onChange={(e) => handleReasonChange(e.target.value, pkg.packageId, true)}
                      />
                    ) : (
                      <Select
                        value={packageReasons[pkg.packageId] ?? ""}
                        onValueChange={(v) => handleReasonChange(v, pkg.packageId, false)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {initiationReasonMetrc.map((item) => (
                            <SelectItem key={item.platformId} value={item.platformId}>
                              {item.Name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                )}
                {showReasonColumn && !isNotLive && (
                  <TableCell className="text-center">
                    <Popover
                      open={activityPopoverKey === pkg.key}
                      onOpenChange={(open) => setActivityPopoverKey(open ? pkg.key : null)}
                    >
                      <PopoverTrigger
                        render={
                          <Button size="sm">
                            {hasUnresolved && <AlertTriangle className="mr-1 size-3.5 animate-pulse text-red-500" />}
                            View Events
                          </Button>
                        }
                      />
                      <PopoverContent className="w-[36rem]">
                        <div className="mb-2 text-sm font-semibold">Activity Details</div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Involved Qty.</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Operated By</TableHead>
                              <TableHead>Created At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {packageEvents.map((event: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell>{event.target}</TableCell>
                                <TableCell
                                  className={
                                    event.operatedStockOnHold > 0
                                      ? "text-green-600"
                                      : event.operatedStockOnHold < 0
                                        ? "text-red-600"
                                        : ""
                                  }
                                >
                                  {event.operatedStockOnHold}
                                </TableCell>
                                <TableCell>
                                  {event.isResolved ? (
                                    <Badge variant={event.isTakenInConsideration ? "secondary" : "default"}>
                                      {event.isTakenInConsideration ? "Passed" : "Qty. Updated"}
                                    </Badge>
                                  ) : (
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => handleEventAction(event, false)}>
                                        Update
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleEventAction(event, true)}>
                                        Pass
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={event.isResolved ? "default" : "secondary"}>
                                    {event.isResolved ? "Resolved" : "Yet To Resolve"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{event.employeeName}</TableCell>
                                <TableCell>{new Date(event.createdAt).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={errorConfirmOpen} onOpenChange={setErrorConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One or more package reconciliation contains errors.</DialogTitle>
            <DialogDescription>Do you want to submit?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorConfirmOpen(false)}>
              No
            </Button>
            <Button
              onClick={async () => {
                setErrorConfirmOpen(false);
                if (successfulPackages.size > 0) await submitSession();
                else toast.error("No successful reconciliations to submit.");
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
