"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Clock, Loader2, Plus, Trash2 } from "lucide-react";

import { listNotifications } from "@/services/notifications/list";
import { removeNotification } from "@/services/notifications/remove";
import { cancelPendingNotification, listPendingNotifications } from "@/services/notifications/pending";
import { listBusinessEntities } from "@/services/businessEntities/list";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableLoadingOverlay, TablePagination } from "@/components/ui/table-pagination";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

import NotificationDetailsPanel from "./NotificationDetailsPanel";
import NotificationSettingsTable from "./NotificationSettingsTable";
import ComposeNotificationDrawer from "./ComposeNotificationDrawer";
import type { EntityOption, NotificationRow, PendingNotification } from "./types";
import { useSettings } from "@/context/settings-context";


function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function NotificationsTable() {
  const { defaultPageSize } = useSettings();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: defaultPageSize, totalEntries: 0, totalPages: 0 });

  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [entityId, setEntityId] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingNotification[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PendingNotification | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);

  const loadNotifications = useCallback(async (page = 1, entity = entityId, size = pagination.limit) => {
    setLoading(true);
    try {
      const res = await listNotifications({ page, limit: size, businessEntityId: entity });
      const body = res?.data?.data;
      setRows(
        (body?.notifications ?? []).map((n: any): NotificationRow => ({
          id: n.id,
          title: n.notificationInfo?.title,
          imageUrl: n.notificationInfo?.imageUrl,
          description: n.notificationInfo?.highlights,
          subject: n.notificationInfo?.subject,
          sentAt: n.createdAt,
          intentTo: n.intentTo,
          scheduledAtDate: n.scheduledAtDate,
          scheduledAtTwelveHours: n.scheduledAtTwelveHours,
          dealId: n.notificationInfo?.subjectInfo?.dealId,
        }))
      );
      const p = res?.data?.paginationData;
      setPagination({
        page: p?.currentPage ?? page,
        limit: p?.limit ?? size,
        totalEntries: p?.totalEntries ?? 0,
        totalPages: p?.totalPages ?? 0,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [entityId, pagination.limit]);

  const loadPending = useCallback(async (showLoading = false) => {
    if (showLoading) setPendingLoading(true);
    try {
      const res = await listPendingNotifications();
      setPending(res?.data?.data?.notifications ?? []);
    } catch (err: any) {
      if (showLoading) toast.error(err?.message || "Failed to fetch pending notifications");
    } finally {
      if (showLoading) setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    listBusinessEntities()
      .then((res) => {
        const list = res?.data?.data?.businessEntities ?? [];
        setEntities(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications(1, entityId);
  }, [entityId, loadNotifications]);

  useEffect(() => {
    loadPending(true);
    const interval = setInterval(() => loadPending(false), 5000);
    return () => clearInterval(interval);
  }, [loadPending]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await removeNotification(deleteTarget.id);
      toast.success("Notification deleted successfully");
      setDeleteTarget(null);
      loadNotifications(pagination.page, entityId, pagination.limit);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete notification");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelPending = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await cancelPendingNotification(cancelTarget.id);
      setPending((prev) => prev.filter((n) => n.id !== cancelTarget.id));
      toast.success("Pending notification cancelled successfully");
      setCancelTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel notification");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Online Ordering</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Notifications</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          <Select
            items={[{ value: "__all__", label: "All Entities" }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
            value={entityId ?? "__all__"}
            onValueChange={(v) => setEntityId(v === "__all__" ? null : (v as string))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Business Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="icon" className="relative">
                  <Clock />
                  {pending.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1">{pending.length}</Badge>
                  )}
                </Button>
              }
            />
            <PopoverContent className="w-96" align="end">
              <div className="mb-2 flex items-center gap-2 border-b pb-2">
                <Bell className="size-4 text-orange-500" />
                <span className="font-semibold">Pending Notifications</span>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto">
                {pendingLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
                    Loading...
                  </div>
                ) : pending.length > 0 ? (
                  pending.map((n) => (
                    <div key={n.id} className="rounded-lg bg-muted/50 p-3">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="flex-1 text-xs font-medium">{n.metaData?.userProvidedTitle || "Untitled"}</span>
                        <Badge variant={n.metaData?.subject === "DEAL" ? "default" : "secondary"} className="shrink-0">
                          {n.metaData?.subject || "OTHER"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-6 shrink-0 text-destructive"
                          onClick={() => setCancelTarget(n)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                        {n.metaData?.userProvidedDescription || ""}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3 text-orange-400" />
                        {n.scheduleDateString} at {n.scheduleTwelveHoursTimeString} ({n.timeZone})
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    <Bell className="mx-auto mb-2 size-8 opacity-50" />
                    No pending notifications
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={() => setComposeOpen(true)}>
            <Plus /> Compose Notification
          </Button>
        </div>
      </div>

      <Tabs defaultValue="my-notifications">
        <TabsList>
          <TabsTrigger value="my-notifications">My Notifications</TabsTrigger>
          <TabsTrigger value="settings">Notification Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="my-notifications" className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className={selected ? "w-2/3" : "w-full"}>
              <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
                <TableLoadingOverlay show={loading && rows.length > 0} />
                <Table>
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow className="bg-muted/60">
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Subject</TableHead>
                      <TableHead className="text-center">Sent At</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading &&
                      rows.length === 0 &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow
                          key={`skeleton-${i}`}
                          className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                        >
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}

                    {!loading && rows.length === 0 && (
                      <TableRow className="border-b-0">
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No notifications found.
                        </TableCell>
                      </TableRow>
                    )}

                    {rows.length > 0 &&
                      rows.map((row, i) => (
                        <TableRow
                          key={row.id}
                          className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                        >
                          <TableCell>
                            <button className="text-left font-medium text-primary hover:underline" onClick={() => setSelected(row)}>
                              {row.title}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="line-clamp-1 max-w-xs">{row.description || "-"}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {row.subject && (
                              <Badge variant={row.subject === "DEAL" ? "default" : row.subject === "COUPON" ? "secondary" : "outline"}>
                                {row.subject}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{formatDate(row.sentAt)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={row.intentTo === "ALL" ? "default" : "secondary"}>{row.intentTo}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="icon-sm" onClick={() => setDeleteTarget(row)}>
                              <Trash2 />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalEntries > 0 && (
                <div className="mt-4">
                  <TablePagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    totalEntries={pagination.totalEntries}
                    pageSize={pagination.limit}
                    loading={loading}
                    onPageChange={(p) => loadNotifications(p)}
                    pageSizeOptions={[30, 50, 100, 200]}
                    onPageSizeChange={(size) => loadNotifications(1, entityId, size)}
                  />
                </div>
              )}
            </div>

            {selected && (
              <div className="w-1/3">
                <NotificationDetailsPanel data={selected} onClose={() => setSelected(null)} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <NotificationSettingsTable />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && !cancelLoading && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Pending Notification</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this scheduled notification?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>No</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCancelPending} disabled={cancelLoading}>
              {cancelLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComposeNotificationDrawer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreated={() => {
          setComposeOpen(false);
          loadNotifications(1);
        }}
      />
    </div>
  );
}
