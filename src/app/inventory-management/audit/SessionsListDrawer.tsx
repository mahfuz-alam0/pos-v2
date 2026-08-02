"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";

import { useShop } from "@/context/shop-context";
import { removeLiveAuditSession } from "@/services/auditSessions/removeLiveAuditSession";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { LiveAuditSession } from "./types";

interface SessionsListDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: LiveAuditSession[];
  loading: boolean;
  locationMap: Record<string, string>;
  onRefresh: () => void;
  onDismissed: () => void;
  currentUserId?: string | number;
}

function minsRemaining(endsAtISO?: string) {
  if (!endsAtISO) return null;
  return Math.max(0, Math.round((new Date(endsAtISO).getTime() - Date.now()) / 60000));
}

export default function SessionsListDrawer({
  open,
  onClose,
  sessions,
  loading,
  locationMap,
  onRefresh,
  onDismissed,
  currentUserId,
}: SessionsListDrawerProps) {
  const router = useRouter();
  const { shopId } = useShop();
  const [dismissingId, setDismissingId] = useState<string | number | null>(null);

  const handleDismiss = async (session: LiveAuditSession) => {
    setDismissingId(session.id);
    try {
      await removeLiveAuditSession(session.id, shopId as string);
      toast.success("Session dismissed");
      onClose();
      onDismissed();
    } catch (err: any) {
      toast.error(err?.message || "Failed to dismiss session");
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={680} zIndex={1000}>
      <div className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Active Audit Sessions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} in progress
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="mb-3 text-4xl">📋</div>
              <div className="text-sm font-medium">No active sessions</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => {
                const isExpired = session.endsAtISO ? new Date(session.endsAtISO).getTime() < Date.now() : false;
                const mins = minsRemaining(session.endsAtISO);
                const pkgCount = Object.keys(session.countKV || {}).filter((k) => k !== "string").length;
                const locName =
                  session.storageLocationId && session.storageLocationId !== "string"
                    ? locationMap[session.storageLocationId] || session.storageLocationId
                    : null;

                return (
                  <div key={session.id} className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={isExpired ? "destructive" : "default"}>
                          {isExpired ? "Expired" : "Active"}
                        </Badge>
                        <span
                          className="cursor-pointer font-mono text-xs text-muted-foreground hover:text-primary"
                          title={session.id}
                          onClick={() => {
                            navigator.clipboard.writeText(session.id);
                            toast.success("Copied!");
                          }}
                        >
                          {session.id?.slice(0, 18)}…
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Created{" "}
                        {session.startedAtISO ? format(new Date(session.startedAtISO), "MMM d, yyyy HH:mm") : "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Packages
                        </span>
                        <span className="text-lg leading-none font-bold">{pkgCount}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Storage Location
                        </span>
                        <span className="text-sm font-medium">{locName || <span className="text-muted-foreground">—</span>}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Ends At
                        </span>
                        <span className="text-sm font-medium">
                          {session.endsAtISO ? format(new Date(session.endsAtISO), "MMM d, HH:mm") : "—"}
                          {mins !== null && (
                            <span className={`ml-2 text-xs font-semibold ${isExpired ? "text-destructive" : "text-green-600"}`}>
                              {isExpired ? "Expired" : `· ${mins} min left`}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t px-4 py-2.5">
                      {currentUserId === session.userId && (
                        <Button size="sm" onClick={() => router.push(`/admin/inventory/audit/${session.id}`)}>
                          Go to Live Count Session
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger>
                          <Button size="sm" variant="destructive" disabled={dismissingId === session.id}>
                            Dismiss Session
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Dismiss this session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the audit session.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDismiss(session)}>Dismiss</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
