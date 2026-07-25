"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { useLiveSessions } from "@/hooks/useLiveSessions";
import { fetchProductsInLiveSession } from "@/services/liveInventory/productsInLiveSession";
import { startProductLiveSession } from "@/services/liveInventory/startProductLiveSession";
import { checkLiveSessionCompatibility } from "@/services/liveInventory/checkLiveSessionCompatibility";
import { replaceLiveSession } from "@/services/liveInventory/replaceLiveSession";
import { connectToSocket } from "@/lib/socket";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function readUserInfo() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("userInfo") ?? "null");
  } catch {
    return null;
  }
}

interface ProductsInvolvedInLiveSessionProps {
  sessionData: any;
  setCountSession: (v: boolean) => void;
  setVisible: (v: boolean) => void;
}

const STATUS_VARIANT: Record<string, "default" | "destructive" | "secondary"> = {
  Approved: "default",
  Rejected: "destructive",
  "Partially Approved": "secondary",
  "Submitted For Approval": "secondary",
  "Count In Progress": "secondary",
  "Yet To Start": "secondary",
};

export default function ProductsInvolvedInLiveSession({
  sessionData,
  setCountSession,
  setVisible,
}: ProductsInvolvedInLiveSessionProps) {
  const { shopId } = useShop();
  const userInfo = readUserInfo();
  const { data: liveSessions } = useLiveSessions(shopId);

  const [productsInLiveSession, setProductsInLiveSession] = useState<(string | number)[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [popoverProductId, setPopoverProductId] = useState<string | number | null>(null);
  const [duration, setDuration] = useState(3600000);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [terminatedNotice, setTerminatedNotice] = useState(false);

  const loadProductsInLiveSession = () => {
    if (!shopId) return;
    fetchProductsInLiveSession(shopId)
      .then((res) => setProductsInLiveSession(res?.data ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    loadProductsInLiveSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, sessionData]);

  const getStatus = (productId: string | number) => {
    if (sessionData?.approvedProductIds?.includes(productId)) return "Approved";
    if (sessionData?.partiallyApprovedProductIds?.includes(productId)) return "Partially Approved";
    if (sessionData?.rejectedProductIds?.includes(productId)) return "Rejected";
    if (sessionData?.submittedProductIds?.includes(productId)) return "Submitted For Approval";
    if (productsInLiveSession.includes(productId)) return "Count In Progress";
    return "Yet To Start";
  };

  const handleStartSession = async (productId: string | number) => {
    setSessionLoading(true);
    try {
      const res = await startProductLiveSession({
        shopId,
        sessionId: sessionData.id,
        productId,
        approximateTimeToFinishInMS: duration,
      });
      if (res?.data?.success) {
        toast.success("Count session started successfully");
        setCountSession(true);
      } else {
        toast.error(res?.data?.error || "Failed to start count session");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setSessionLoading(false);
      setPopoverProductId(null);
    }
  };

  const replaceUserSession = async () => {
    try {
      await replaceLiveSession({ shopId, sessionId: sessionData.id });
      const socket = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/live-count-session`, shopId });
      socket?.on("liveCountUserSessionReplaced", (data: any) => {
        if (userInfo?.sessionId === data.session.userSessionId) {
          setCountSession(true);
        } else {
          setTerminatedNotice(true);
          setVisible(false);
          setCountSession(false);
        }
      });
    } catch (err) {
      console.error("Error replacing session:", err);
    }
    setReplaceConfirmOpen(false);
  };

  const handleActionClick = async (productId: string | number, isProductInLiveSession: boolean) => {
    if (isProductInLiveSession) {
      const res = await checkLiveSessionCompatibility(shopId, { id: sessionData.id });
      if (res?.data?.isCompatible) {
        setCountSession(true);
      } else {
        setReplaceConfirmOpen(true);
      }
    } else {
      setPopoverProductId(productId);
    }
  };

  const isAdminOrSuperAdmin = userInfo?.type === "SUPER_ADMIN" || userInfo?.type === "ADMINISTRATION";
  const isAssignedToUser = sessionData?.assignedTo?.id === userInfo?.id;
  const sessions = liveSessions?.data?.sessions ?? [];

  const rows = (sessionData?.associatedProducts ?? []).map((product: any) => ({
    productId: product.id,
    productName: product.name,
    countStatus: getStatus(product.id),
  }));

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isProductInLiveSession = sessions.some(
              (s: any) => s.productId === row.productId && s.sessionId === sessionData.id
            );
            const sessionLength = sessions.length;
            const canStartLiveCount =
              sessionLength < 3 &&
              (isAdminOrSuperAdmin || (userInfo?.type === "ACCESS_CONTROLLED" && isAssignedToUser));
            const canGoToLiveCount =
              isProductInLiveSession &&
              (isAdminOrSuperAdmin || (userInfo?.type === "ACCESS_CONTROLLED" && isAssignedToUser));

            const checkSessionHasLiveSession = sessions.some((s: any) => s.sessionId === sessionData.id);
            let buttonDisabled: boolean;
            let buttonText: string;
            if (checkSessionHasLiveSession) {
              buttonDisabled = !isProductInLiveSession || (!canStartLiveCount && !canGoToLiveCount);
              buttonText = isProductInLiveSession ? "Go To Live Count" : "Start Live Count";
            } else if (row.countStatus === "Submitted For Approval") {
              buttonDisabled = true;
              buttonText = "Submitted";
            } else {
              buttonDisabled = isProductInLiveSession || (!canStartLiveCount && !canGoToLiveCount);
              buttonText = isProductInLiveSession ? "Go To Live Count" : "Start Live Count";
            }

            return (
              <TableRow key={row.productId}>
                <TableCell>{row.productName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.countStatus] ?? "secondary"}>{row.countStatus}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Popover
                    open={popoverProductId === row.productId}
                    onOpenChange={(open) => !open && setPopoverProductId(null)}
                  >
                    <PopoverTrigger
                      render={
                        <Button
                          size="sm"
                          disabled={buttonDisabled}
                          onClick={() => handleActionClick(row.productId, isProductInLiveSession)}
                        >
                          {buttonText}
                        </Button>
                      }
                    />
                    <PopoverContent className="w-70">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Duration</label>
                        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((hour) => (
                              <SelectItem key={hour} value={String(hour * 3600000)}>
                                {hour} hour(s)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-end">
                          <Button size="sm" disabled={sessionLoading} onClick={() => handleStartSession(row.productId)}>
                            Start
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Another Session In Progress</DialogTitle>
            <DialogDescription>
              Another session is currently in progress. Do you want to continue the session in this window?
              Previous live session will be terminated but data will be there.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceConfirmOpen(false)}>
              No
            </Button>
            <Button onClick={replaceUserSession}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={terminatedNotice} onOpenChange={setTerminatedNotice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Replaced</DialogTitle>
            <DialogDescription>This live count session has been replaced by someone.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
