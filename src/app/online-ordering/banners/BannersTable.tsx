"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { fetchBannersList } from "@/services/banners/list";
import { deleteBanner } from "@/services/banners/remove";
import { listBusinessEntities } from "@/services/businessEntities/list";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import BannerFormDrawer from "./BannerFormDrawer";
import { BANNER_TABS, type BannerRow, type BannerType } from "./types";

export default function BannersTable() {
  const [rows, setRows] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<BannerType>(BANNER_TABS[0].key);

  const [entities, setEntities] = useState<{ id: string | number; name: string }[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [entityId, setEntityId] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<{ open: boolean; mode: "add" | "edit"; bannerId: string | number | null }>({
    open: false,
    mode: "add",
    bannerId: null,
  });

  const [deleteTarget, setDeleteTarget] = useState<BannerRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setEntitiesLoading(true);
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities ?? []))
      .catch((err: any) => toast.error(err?.message || "Failed to load business entities"))
      .finally(() => setEntitiesLoading(false));
  }, []);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBannersList(entityId, activeTab);
      setRows(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, [entityId, activeTab]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteBanner(deleteTarget.id);
      toast.success("Banner deleted successfully");
      setDeleteTarget(null);
      loadBanners();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete banner");
    } finally {
      setDeleteLoading(false);
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
              <BreadcrumbPage>Banners</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-end gap-3">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Business Entity</div>
            <Select
              items={[
                { value: "__none__", label: "None" },
                ...entities.map((e) => ({ value: String(e.id), label: e.name })),
              ]}
              value={entityId ?? "__none__"}
              onValueChange={(value) => setEntityId(value === "__none__" ? null : value)}
              disabled={entitiesLoading}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select business entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setDrawer({ open: true, mode: "add", bannerId: null })}>
            <Plus /> Add Banner
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BannerType)}>
        <TabsList>
          {BANNER_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-4">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-55 w-full rounded-lg" />)}

        {!loading && rows.length === 0 && (
          <div className="rounded-lg py-16 text-center text-muted-foreground ring-1 ring-foreground/10">
            No banners found.
          </div>
        )}

        {!loading &&
          rows.map((banner) => (
            <div
              key={banner.id}
              className="group relative h-55 w-full overflow-hidden rounded-lg ring-1 ring-foreground/10"
            >
              <div
                className="size-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${banner.imageUrl})` }}
              />
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />

              <div className="absolute top-3 right-3 flex gap-2">
                <Badge variant={!banner.isDisabled ? "default" : "destructive"} className="backdrop-blur-md">
                  {!banner.isDisabled ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="secondary" className="backdrop-blur-md">
                  {banner.bannerDuration}s
                </Badge>
              </div>

              <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  className="backdrop-blur-md"
                  onClick={() => setDrawer({ open: true, mode: "edit", bannerId: banner.id })}
                >
                  <Pencil /> Edit
                </Button>
                <Button size="sm" variant="destructive" className="backdrop-blur-md" onClick={() => setDeleteTarget(banner)}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </div>
          ))}
      </div>

      <BannerFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        bannerId={drawer.bannerId}
        bannerType={activeTab}
        onClose={() => setDrawer((prev) => ({ ...prev, open: false }))}
        onSaved={loadBanners}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this banner? This cannot be undone.
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
    </div>
  );
}
