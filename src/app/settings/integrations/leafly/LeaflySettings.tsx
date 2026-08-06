"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from "lucide-react";

import { connectToSocket } from "@/lib/socket";
import { fetchLeaflyConfig } from "@/services/leafly/getConfig";
import { saveLeaflyConfig } from "@/services/leafly/saveConfig";
import { pushFullMenu } from "@/services/leafly/pushFullMenu";
import { removeAllFromLeafly } from "@/services/leafly/removeAllFromLeafly";

import Drawer from "@/components/ui/Drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PushStage = "started" | "fetching" | "building" | "pushing" | "updating" | "completed" | "failed";

const STAGES: { key: PushStage; title: string }[] = [
  { key: "started", title: "Started" },
  { key: "fetching", title: "Fetching packages" },
  { key: "building", title: "Building menu items" },
  { key: "pushing", title: "Pushing to Leafly" },
  { key: "updating", title: "Updating records" },
  { key: "completed", title: "Completed" },
];

export default function LeaflySettings({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [menuIntegrationKey, setMenuIntegrationKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushProgress, setPushProgress] = useState<{ stage: PushStage; message?: string; total?: number } | null>(null);
  const [removeAllLoading, setRemoveAllLoading] = useState(false);
  const [removeAllConfirmOpen, setRemoveAllConfirmOpen] = useState(false);
  const socketRef = useRef<ReturnType<typeof connectToSocket>>(null);

  useEffect(() => {
    if (!open) return;

    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    setInitialLoading(true);
    fetchLeaflyConfig(shopId)
      .then((res) => {
        const key = res?.data?.data?.menuIntegrationKey || "";
        setMenuIntegrationKey(key);
        setIsConfigured(!!key);
      })
      .finally(() => setInitialLoading(false));

    const socket = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/leafly-order-status`, shopId });
    socketRef.current = socket;

    const handleProgress = (payload: any) => {
      setPushProgress(payload);
      if (payload?.stage === "completed" || payload?.stage === "failed") {
        setPushLoading(false);
      }
    };

    socket?.on("menuPushProgress", handleProgress);
    return () => {
      socket?.off("menuPushProgress", handleProgress);
      socket?.disconnect();
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!menuIntegrationKey.trim()) {
      toast.error("Menu Integration Key is required.");
      return;
    }

    setLoading(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      await saveLeaflyConfig({ shopId, menuIntegrationKey });
      setIsConfigured(true);
      toast.success("Leafly configuration saved successfully!");
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save Leafly configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handlePushFullMenu = async () => {
    setPushLoading(true);
    try {
      await pushFullMenu();
      toast.success("Full inventory pushed to Leafly successfully!");
    } catch (err: any) {
      setPushLoading(false);
      toast.error(err?.message || "Failed to push full menu to Leafly.");
    }
  };

  const handleRemoveAll = async () => {
    setRemoveAllLoading(true);
    try {
      await removeAllFromLeafly();
      toast.success("All inventory removed from Leafly successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove menu from Leafly.");
    } finally {
      setRemoveAllLoading(false);
      setRemoveAllConfirmOpen(false);
    }
  };

  const stageIndex = pushProgress ? STAGES.findIndex((s) => s.key === pushProgress.stage) : -1;
  const isFailed = pushProgress?.stage === "failed";

  return (
    <Drawer open={open} onClose={loading ? undefined : onClose} side="right" size={640}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <Image src="/images/leafly-logo.png" alt="Leafly" width={32} height={32} className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">Leafly Integration</div>
            <div className="text-xs leading-tight text-muted-foreground">Sync menu and manage orders</div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={loading}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Tabs defaultValue="configuration">
            <TabsList>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="menu">Menu Integration</TabsTrigger>
            </TabsList>

            <TabsContent value="configuration" className="flex flex-col gap-4 pt-4">
              {initialLoading ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                  <Skeleton className="h-9 w-36" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Configure your Leafly menu integration key to sync your menu and manage orders.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="menu-integration-key">Menu Integration Key</Label>
                    <Input
                      id="menu-integration-key"
                      placeholder="Enter your Leafly Menu Integration Key"
                      value={menuIntegrationKey}
                      onChange={(e) => setMenuIntegrationKey(e.target.value)}
                    />
                  </div>

                  <div>
                    <Button onClick={handleSubmit} disabled={loading}>
                      {loading ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="menu" className="flex flex-col gap-6 pt-4">
              {initialLoading ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : (
                <>
              <p className="text-sm text-muted-foreground">
                Push your full inventory to Leafly or manage individual products from the Inventory page.
              </p>

              {!isConfigured && (
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900">
                  Please save your Leafly configuration (Menu Integration Key) on the Configuration tab before pushing your menu.
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
                <p className="text-sm font-semibold">Push Full Inventory to Leafly</p>
                <p className="text-sm text-muted-foreground">
                  This will sync all your active inventory items to your Leafly menu at once. You can also push individual items from
                  the Manage Inventories page.
                </p>
                <div>
                  <Button disabled={!isConfigured || pushLoading} onClick={handlePushFullMenu}>
                    {pushLoading ? "Pushing..." : "Push Full Menu to Leafly"}
                  </Button>
                </div>

                {pushProgress && (
                  <div className="mt-2 flex flex-col gap-3">
                    {isFailed && (
                      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <XCircle className="size-4 shrink-0" />
                        <span>Push Failed — {pushProgress.message}</span>
                      </div>
                    )}
                    {pushProgress.stage === "completed" && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>Push Completed — {pushProgress.message}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {STAGES.map((stage, idx) => {
                        const isCurrent = idx === stageIndex && !isFailed;
                        const isDone = idx < stageIndex || pushProgress.stage === "completed";
                        return (
                          <div key={stage.key} className="flex items-start gap-2 text-sm">
                            {isCurrent && pushProgress.stage !== "completed" ? (
                              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                            ) : isDone ? (
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                            ) : (
                              <div className="mt-1 size-2.5 shrink-0 rounded-full bg-muted" />
                            )}
                            <div>
                              <p className={isCurrent || isDone ? "font-medium" : "text-muted-foreground"}>{stage.title}</p>
                              {idx === stageIndex && (
                                <p className="text-xs text-muted-foreground">
                                  {pushProgress.message}
                                  {pushProgress.total ? ` (${pushProgress.total})` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-destructive/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">Danger Zone</p>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">Remove all inventory from Leafly</p>
                    <p className="text-xs text-muted-foreground">
                      This will remove all synced inventory items from your Leafly menu. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    disabled={!isConfigured || removeAllLoading}
                    onClick={() => setRemoveAllConfirmOpen(true)}
                  >
                    Remove All
                  </Button>
                </div>
              </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={removeAllConfirmOpen} onOpenChange={setRemoveAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all inventory from Leafly?</AlertDialogTitle>
            <AlertDialogDescription>This will remove all synced inventory items from your Leafly menu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={removeAllLoading} onClick={handleRemoveAll}>
              {removeAllLoading ? "Removing..." : "Yes, Remove All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
}
