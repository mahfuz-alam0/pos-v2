"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";

import { useShop } from "@/context/shop-context";
import { usePermission } from "@/util/use-permission";
import { fetchEmployeesList } from "@/services/employees/list";
import { startAssignedAuditSession } from "@/services/assignedAuditSessions/start";
import { removeAssignedAuditSession } from "@/services/assignedAuditSessions/remove";

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

interface PendingSessionsDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: any[];
  loading: boolean;
  locationMap: Record<string, string>;
  onRefresh: () => void;
  onChanged: () => void;
  currentUserId?: string | number;
}

export default function PendingSessionsDrawer({
  open,
  onClose,
  sessions,
  loading,
  locationMap,
  onRefresh,
  onChanged,
  currentUserId,
}: PendingSessionsDrawerProps) {
  const router = useRouter();
  const { shopId } = useShop();
  const { hasRole } = usePermission();
  const canManageAny = hasRole("BOTH");

  const [employeeMap, setEmployeeMap] = useState<Record<string, string>>({});
  const [startingId, setStartingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetchEmployeesList({ limit: 100 }).then((res) => {
      const list = res?.data?.employees ?? res?.data ?? [];
      const map: Record<string, string> = {};
      list.forEach((e: any) => {
        map[e.id] = `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.name || e.email;
      });
      setEmployeeMap(map);
    });
  }, [open]);

  const handleStart = async (session: any) => {
    setStartingId(session.id);
    try {
      const res = await startAssignedAuditSession(shopId as string, { sessionId: session.id });
      const started = res?.data?.data?.session || res?.data?.data;
      toast.success("Session started");
      onClose();
      onChanged();
      if (started?.id) router.push(`/inventory-management/audit/${started.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start session");
    } finally {
      setStartingId(null);
    }
  };

  const handleDelete = async (session: any) => {
    setDeletingId(session.id);
    try {
      await removeAssignedAuditSession(session.id, shopId as string);
      toast.success("Pending session deleted");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete session");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} side="right" size={680} zIndex={1000}>
      <div className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Pending Audit Sessions</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} pending
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
              <div className="text-sm font-medium">No pending sessions</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => {
                const locName =
                  session.storageLocationId && session.storageLocationId !== "string"
                    ? locationMap[session.storageLocationId] || session.storageLocationId
                    : null;
                const assignedName =
                  session.assignedToId === currentUserId
                    ? "You"
                    : employeeMap[session.assignedToId] || session.assignedToId || "—";
                const createdAt = session.createdAtISO || session.createdAt;
                const canStart = canManageAny || session.assignedToId === currentUserId;

                return (
                  <div key={session.id} className="overflow-hidden rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
                      <Badge variant="secondary">Pending</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Created {createdAt ? format(new Date(createdAt), "MMM d, yyyy HH:mm") : "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Assigned To
                        </span>
                        <span className="text-sm font-medium">{assignedName}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Storage Location
                        </span>
                        <span className="text-sm font-medium">{locName || <span className="text-muted-foreground">—</span>}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Count Method
                        </span>
                        <span className="text-sm font-medium">{session.countMethod || "—"}</span>
                      </div>
                      {session.isBlindCount && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Blind Count
                          </span>
                          <span className="text-sm font-medium">Yes</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 border-t px-4 py-2.5">
                      {canStart && (
                        <Button size="sm" onClick={() => handleStart(session)} disabled={startingId === session.id}>
                          {startingId === session.id ? "Starting…" : "Start"}
                        </Button>
                      )}

                      {canManageAny && (
                        <AlertDialog>
                          <AlertDialogTrigger>
                            <Button size="sm" variant="destructive" disabled={deletingId === session.id}>
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent zIndex={1010}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this pending session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the pending audit session.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(session)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
