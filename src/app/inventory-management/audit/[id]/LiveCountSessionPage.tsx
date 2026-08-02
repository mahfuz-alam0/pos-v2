"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Barcode, Maximize, Minimize, Loader2 } from "lucide-react";

import { useShop } from "@/context/shop-context";
import { connectToSocket } from "@/lib/socket";
import { fetchLiveAuditSessionSummary } from "@/services/auditSessions/getSummary";
import { fetchSingleLiveAuditSession } from "@/services/auditSessions/getSingleLiveSession";
import { setAuditSessionCountKvProperty } from "@/services/auditSessions/setCountKvProperty";
import { markAuditSessionPackageAsDone } from "@/services/auditSessions/markPackageAsDone";
import { createCommittedAuditSession } from "@/services/committedAuditSessions/create";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import CountingModeToggle from "../CountingModeToggle";

interface LiveCountSessionPageProps {
  sessionId: string;
}

function sumQty(events: any[] = []) {
  return events.reduce((s, e) => s + (e.qty || 0), 0);
}

function readShopIdFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("shopId") || "null");
  } catch {
    return null;
  }
}

export default function LiveCountSessionPage({ sessionId }: LiveCountSessionPageProps) {
  const router = useRouter();
  const { shopId } = useShop();

  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [countingMode, setCountingMode] = useState<"manual" | "scan">("manual");
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({});
  const [flashingRows, setFlashingRows] = useState<Record<string, boolean>>({});
  const [scanInput, setScanInput] = useState("");
  const [manualCounts, setManualCounts] = useState<Record<string, any>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [donePackages, setDonePackages] = useState<Record<string, boolean>>({});
  const [markingDone, setMarkingDone] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [soldQtyKV, setSoldQtyKV] = useState<Record<string, number>>({});
  const [returnedQtyKV, setReturnedQtyKV] = useState<Record<string, number>>({});

  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const socketRef = useRef<any>(null);
  const packagesRef = useRef<any[]>([]);

  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);

  const seedManualCounts = (pkgs: any[]) => {
    setManualCounts((prev) => {
      const next = { ...prev };
      pkgs.forEach((pkg) => {
        if (next[pkg.id] === undefined && pkg.finalQty != null) {
          next[pkg.id] = pkg.finalQty;
        }
      });
      return next;
    });
  };

  const fetchSummary = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetchLiveAuditSessionSummary(shopId, sessionId);
      const pkgs = res?.data?.packagesData || [];
      setSessionData(res?.data ?? null);
      setPackages(pkgs);
      seedManualCounts(pkgs);
    } catch {
      toast.error("Failed to load session summary.");
    } finally {
      setLoading(false);
    }
  }, [shopId, sessionId]);

  const fetchSessionSingle = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await fetchSingleLiveAuditSession(shopId, sessionId);
      const session = res?.data?.session;
      if (!session) return;

      const countKV = session.countKV || {};
      const markedAsDoneKV = session.markedAsDoneKV || {};

      setManualCounts((prev) => ({ ...prev, ...countKV }));
      setDonePackages((prev) => {
        const next = { ...prev };
        Object.entries(markedAsDoneKV).forEach(([k, v]) => {
          if (v) next[k] = true;
        });
        return next;
      });
      setSoldQtyKV(session.soldQtyKV || {});
      setReturnedQtyKV(session.returnedQtyKV || {});
    } catch {
      // non-fatal, summary call already covers counted/final qty
    }
  }, [shopId, sessionId]);

  useEffect(() => {
    if (!sessionId || !shopId) return;
    fetchSummary();
    fetchSessionSingle();
  }, [sessionId, shopId, fetchSummary, fetchSessionSingle]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const shopIdForSocket = shopId || readShopIdFromStorage();
    if (!baseUrl || !shopIdForSocket) return;

    const socket = connectToSocket({ url: `${baseUrl}/platform-sales-status`, shopId: shopIdForSocket });
    socketRef.current = socket;
    if (!socket) return;

    const flashRow = (packageId: string) => {
      setFlashingRows((prev) => ({ ...prev, [packageId]: true }));
      setTimeout(() => {
        setFlashingRows((prev) => {
          const next = { ...prev };
          delete next[packageId];
          return next;
        });
      }, 1400);
    };

    const onPackageQuantityEvents = (data: any) => {
      const pkg = packagesRef.current.find((p) => p.id === data.packageId);
      if (pkg) flashRow(pkg.id);
    };

    const onPlatformSaleEvents = (data: any) => {
      const pkg = packagesRef.current.find((p) => p.advertisedId === data.advertisedId);
      if (pkg) {
        flashRow(pkg.id);
        toast.info(data.message || `${data.advertisedId} sold`, {
          description: data.type === "PRE-SALE" ? "Pre-Sale" : "Sale",
        });
      }
    };

    const onAuditSessionQtyTracker = (data: any) => {
      if (data.sessionId !== sessionId) return;
      setSoldQtyKV(data.soldQtyKV || {});
      setReturnedQtyKV(data.returnedQtyKV || {});
      if (data.countKV) {
        setManualCounts((prev) => {
          const next = { ...prev };
          Object.entries(data.countKV).forEach(([k, v]) => {
            if (v != null) next[k] = v;
          });
          return next;
        });
      }
    };

    socket.on("packageQuantityEvents", onPackageQuantityEvents);
    socket.on("platformSaleEvents", onPlatformSaleEvents);
    socket.on("auditSessionQtyTracker", onAuditSessionQtyTracker);

    return () => {
      socket.off("packageQuantityEvents", onPackageQuantityEvents);
      socket.off("platformSaleEvents", onPlatformSaleEvents);
      socket.off("auditSessionQtyTracker", onAuditSessionQtyTracker);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, sessionId]);

  useEffect(() => {
    if (countingMode === "scan") {
      const timer = setTimeout(() => scanInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [countingMode]);

  useEffect(() => {
    if (fullscreen) document.body.classList.add("live-count-fullscreen");
    else document.body.classList.remove("live-count-fullscreen");
    return () => document.body.classList.remove("live-count-fullscreen");
  }, [fullscreen]);

  const debouncedSave = (packageId: string, value: number) => {
    if (saveDebounceRef.current[packageId]) clearTimeout(saveDebounceRef.current[packageId]);
    saveDebounceRef.current[packageId] = setTimeout(async () => {
      try {
        await setAuditSessionCountKvProperty({ shopId: shopId as string, id: sessionId, packageId, value });
        toast.success("Count saved", { duration: 1500 });
      } catch {
        toast.error("Failed to save count.");
      }
    }, 500);
  };

  const handleMarkAsDone = async (packageId: string) => {
    setMarkingDone((prev) => ({ ...prev, [packageId]: true }));
    try {
      await markAuditSessionPackageAsDone({ shopId: shopId as string, id: sessionId, packageId, value: true });
      setDonePackages((prev) => ({ ...prev, [packageId]: true }));
      toast.success("Package marked as done");
    } catch {
      toast.error("Failed to mark package as done.");
    } finally {
      setMarkingDone((prev) => ({ ...prev, [packageId]: false }));
    }
  };

  const getCountedQty = (pkg: any) => {
    if (countingMode === "scan") return scanCounts[pkg.id] || 0;
    const parsed = parseFloat(manualCounts[pkg.id]);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getCheckedTotals = (pkg: any) => ({
    salesQty: sumQty(pkg.saleEvents),
    returnsQty: sumQty(pkg.saleReturnEvents),
  });

  const getQtyOnHand = (pkg: any) => {
    const counted = getCountedQty(pkg);
    const { salesQty, returnsQty } = getCheckedTotals(pkg);
    return counted - salesQty + returnsQty;
  };

  const handleScan = (rawValue: string) => {
    const trimmed = rawValue?.trim();
    if (!trimmed) return;

    const lower = trimmed.toLowerCase();
    const found = packages.find(
      (pkg) =>
        (pkg.advertisedId && pkg.advertisedId.toLowerCase() === lower) ||
        (pkg.metrcTag && pkg.metrcTag.toLowerCase() === lower)
    );

    if (found) {
      const newCount = (scanCounts[found.id] || 0) + 1;
      setScanCounts((prev) => ({ ...prev, [found.id]: newCount }));
      debouncedSave(found.id, newCount);

      setFlashingRows((prev) => ({ ...prev, [found.id]: true }));
      setTimeout(() => {
        setFlashingRows((prev) => {
          const next = { ...prev };
          delete next[found.id];
          return next;
        });
      }, 1400);

      toast.success(`✓ ${found.productName || found.advertisedId} — Count: ${newCount}`);
    } else {
      toast.warning(`Package not found: "${trimmed}"`);
    }

    setScanInput("");
    setTimeout(() => scanInputRef.current?.focus(), 60);
  };

  const handleSubmit = async () => {
    const packagesCountData = packages
      .map((pkg) => {
        const finalQty = getQtyOnHand(pkg);
        const adjustment = finalQty - (pkg.currentQtySnapshot ?? 0);
        return { packageId: pkg.id, finalQty, adjustment };
      })
      .filter((p) => p.adjustment !== 0)
      .map(({ packageId, finalQty }) => ({ packageId, finalQty }));

    if (packagesCountData.length === 0) {
      toast.warning("No packages have a quantity change to submit.");
      return;
    }

    setSubmitting(true);
    try {
      await createCommittedAuditSession({ shopId: shopId as string, auditSessionId: sessionId, packagesCountData });
      toast.success("Audit session committed successfully.");
      router.push("/inventory-management/reconciliation");
    } catch (err: any) {
      toast.error(err?.message || "Failed to commit audit session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={fullscreen ? "fixed inset-0 z-2000 overflow-y-auto bg-background p-3" : ""}>
      <div className="rounded-lg border bg-card">
        <div className="px-4 pt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/inventory-management">Inventory Management</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/inventory-management/audit">Audit</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Live Count Session</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <Tooltip>
              <TooltipTrigger>
                <Button variant="outline" size="icon" onClick={() => setFullscreen((f) => !f)}>
                  {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{fullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>
          </div>

          <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-green-800 dark:text-green-400">Session Details</span>
              <Badge>{packages.length} package(s)</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-sm">
                <span className="font-semibold">Started At:</span>{" "}
                {sessionData?.startedAtISO ? format(new Date(sessionData.startedAtISO), "MMM d, yyyy HH:mm") : "—"}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Ends At:</span>{" "}
                {sessionData?.endsAtISO ? format(new Date(sessionData.endsAtISO), "MMM d, yyyy HH:mm") : "—"}
              </div>
              <CountingModeToggle value={countingMode} onChange={setCountingMode} />
              {countingMode === "manual" && Object.keys(manualCounts).length > 0 && (
                <Button size="sm" variant="destructive" onClick={() => setManualCounts({})}>
                  Clear Counts
                </Button>
              )}
            </div>
          </div>

          {countingMode === "scan" && (
            <div className="mb-3 rounded-[10px] border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-3 dark:border-blue-800 dark:from-blue-950/40 dark:to-blue-900/30">
              <div className="flex flex-wrap items-center gap-3">
                <Barcode className="size-6 shrink-0 text-blue-600 dark:text-blue-400" />
                <Input
                  ref={scanInputRef}
                  value={scanInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScanInput(val);
                    if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
                    if (val.trim().length >= 5) {
                      scanDebounceRef.current = setTimeout(() => handleScan(val), 300);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (scanDebounceRef.current) clearTimeout(scanDebounceRef.current);
                      handleScan(scanInput);
                    }
                  }}
                  placeholder="Scan or type Package ID…"
                  className="min-w-60 flex-1 border-blue-500 bg-white text-[15px] dark:bg-background"
                />
                {Object.keys(scanCounts).length > 0 ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="whitespace-nowrap rounded-full bg-blue-200 px-3 py-1 text-[13px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {Object.keys(scanCounts).length} pkg{Object.keys(scanCounts).length !== 1 ? "s" : ""} ·{" "}
                      {Object.values(scanCounts).reduce((a, b) => a + b, 0)} scanned
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setScanCounts({});
                        setFlashingRows({});
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <span className="whitespace-nowrap text-[13px] text-muted-foreground">Ready to scan…</span>
                )}
              </div>
            </div>
          )}

          <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-muted/60">
                  <TableHead>Package ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>METRC Tag</TableHead>
                  <TableHead className="text-center">Starting Qty</TableHead>
                  <TableHead className="text-center">Current Qty</TableHead>
                  <TableHead className="text-center">{countingMode === "scan" ? "Scan Count" : "Counted Qty"}</TableHead>
                  <TableHead className="sticky right-[140px] bg-background text-center">Final Counted Qty</TableHead>
                  <TableHead className="sticky right-0 bg-background text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!loading && packages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No packages in this session.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  packages.map((pkg) => {
                    const sold = soldQtyKV[pkg.id] || 0;
                    const returned = returnedQtyKV[pkg.id] || 0;
                    const { salesQty, returnsQty } = getCheckedTotals(pkg);
                    const currentQty = (pkg.currentQtySnapshot ?? 0) - salesQty + returnsQty;
                    const finalQty = getQtyOnHand(pkg);
                    const isDone = Boolean(donePackages[pkg.id]);
                    const hasEvents = salesQty > 0 || returnsQty > 0;

                    return (
                      <TableRow key={pkg.id} className={flashingRows[pkg.id] ? "animate-[scanRowFlash_1.4s_ease-out]" : ""}>
                        <TableCell>
                          <div className="font-mono text-xs">{pkg.advertisedId || "—"}</div>
                          {(sold > 0 || returned > 0) && (
                            <div className="mt-0.5 flex gap-2 text-[11px]">
                              {sold > 0 && <span className="text-destructive">Sold: {sold}</span>}
                              {returned > 0 && <span className="text-green-600">Returned: {returned}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-55 truncate">{pkg.productName}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{pkg.metrcTag || "—"}</TableCell>
                        <TableCell className="text-center">{pkg.startingCount ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {hasEvents ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="underline decoration-dotted">{currentQty}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {pkg.currentQtySnapshot ?? 0} - {salesQty} sold + {returnsQty} returned = {currentQty}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            currentQty
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {countingMode === "scan" ? (
                            (scanCounts[pkg.id] || 0) > 0 ? (
                              <span className="inline-flex min-w-13 items-center justify-center gap-1 rounded-full bg-green-100 px-3.5 py-0.5 text-sm font-bold text-green-600 dark:bg-green-950 dark:text-green-400">
                                ×{scanCounts[pkg.id]}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )
                          ) : (
                            <Input
                              value={manualCounts[pkg.id] ?? ""}
                              disabled={isDone}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualCounts((prev) => ({ ...prev, [pkg.id]: val }));
                                const parsed = parseFloat(val);
                                if (!isNaN(parsed)) debouncedSave(pkg.id, parsed);
                              }}
                              placeholder="0"
                              className="mx-auto w-24 text-center"
                            />
                          )}
                        </TableCell>
                        <TableCell className="sticky right-[140px] bg-background text-center">
                          {hasEvents ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant={finalQty >= 0 ? "default" : "destructive"}>{finalQty}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                counted {getCountedQty(pkg)} - {salesQty} sold + {returnsQty} returned = {finalQty}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant={finalQty >= 0 ? "default" : "destructive"}>{finalQty}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="sticky right-0 bg-background text-center">
                          {isDone ? (
                            <Badge>Done</Badge>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger>
                                <Button size="sm" disabled={markingDone[pkg.id]}>
                                  {markingDone[pkg.id] ? <Loader2 className="size-3.5 animate-spin" /> : "Mark as Done"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Mark this package as done?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleMarkAsDone(pkg.id)}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end px-3 py-4">
            <AlertDialog>
              <AlertDialogTrigger>
                <Button size="lg" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Audit"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit this audit session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently record the counted quantities. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
