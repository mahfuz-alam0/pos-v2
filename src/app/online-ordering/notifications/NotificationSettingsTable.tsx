"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

import { getNotificationSettings, updateNotificationSettings } from "@/services/notifications/settings";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettingRow {
  key: string;
  event: string;
  message: string;
  title: string;
  imageUrl?: string;
  isEnabled: boolean;
  isPushNotificationEnabled: boolean;
  isInAppNotificationEnabled: boolean;
}

function titleCase(key: string) {
  return key
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function NotificationSettingsTable() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<SettingRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editPush, setEditPush] = useState(true);
  const [editInApp, setEditInApp] = useState(true);
  const [editEnabled, setEditEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await getNotificationSettings();
      const settings = res?.data?.data?.settings ?? {};
      setRows(
        Object.entries(settings).map(([key, value]: [string, any]) => ({
          key,
          event: titleCase(key),
          message: value.description,
          title: value.title,
          imageUrl: value.imageUrl,
          isEnabled: !!value.isEnabled,
          isPushNotificationEnabled: !!value.isPushNotificationEnabled,
          isInAppNotificationEnabled: !!value.isInAppNotificationEnabled,
        }))
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const openEdit = (row: SettingRow) => {
    setEditTarget(row);
    setEditTitle(row.title);
    setEditMessage(row.message);
    setEditPush(row.isPushNotificationEnabled);
    setEditInApp(row.isInAppNotificationEnabled);
    setEditEnabled(row.isEnabled);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const settings = rows.reduce((acc: Record<string, any>, row) => {
        acc[row.key] = {
          isPushNotificationEnabled: row.isPushNotificationEnabled,
          isInAppNotificationEnabled: row.isInAppNotificationEnabled,
          title: row.title,
          description: row.message,
          isEnabled: row.isEnabled,
          imageUrl: row.imageUrl ?? null,
        };
        return acc;
      }, {});

      settings[editTarget.key] = {
        isPushNotificationEnabled: editPush,
        isInAppNotificationEnabled: editInApp,
        title: editTitle,
        description: editMessage,
        isEnabled: editEnabled,
        imageUrl: null,
      };

      await updateNotificationSettings({ settings });
      toast.success("Settings updated successfully");
      setEditTarget(null);
      loadSettings();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Event</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="text-center">Push Notification</TableHead>
              <TableHead className="text-center">In-App Notification</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              rows.length === 0 &&
              Array.from({ length: 4 }).map((_, i) => (
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
                  No notification settings found.
                </TableCell>
              </TableRow>
            )}

            {rows.map((row, i) => (
              <TableRow
                key={row.key}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
              >
                <TableCell className="font-medium">{row.event}</TableCell>
                <TableCell>
                  <div className="line-clamp-1 max-w-xs">{row.message}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.isPushNotificationEnabled ? "default" : "destructive"}>
                    {row.isPushNotificationEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.isInAppNotificationEnabled ? "default" : "destructive"}>
                    {row.isInAppNotificationEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.isEnabled ? "default" : "destructive"}>{row.isEnabled ? "Enabled" : "Disabled"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="icon-sm" onClick={() => openEdit(row)}>
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && !saving && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notification Setting</DialogTitle>
            <DialogDescription>{editTarget?.event}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Message</Label>
              <Textarea rows={4} value={editMessage} onChange={(e) => setEditMessage(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={editPush} onCheckedChange={(c) => setEditPush(!!c)} />
              Enable Push Notifications
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={editInApp} onCheckedChange={(c) => setEditInApp(!!c)} />
              Enable In-App Notifications
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={editEnabled} onCheckedChange={(c) => setEditEnabled(!!c)} />
              Enable Notification
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
