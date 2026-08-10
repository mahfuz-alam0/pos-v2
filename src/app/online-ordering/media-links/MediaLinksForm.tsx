"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getMediaLinks } from "@/services/mediaLinks/getMediaLinks";
import { updateMediaLinks } from "@/services/mediaLinks/updateMediaLinks";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Field, SingleImageUpload } from "@/components/admin/form-fields";
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

import { BusinessEntitySelect } from "../general/BusinessEntitySelect";

type MediaKey = "mainLogoURL" | "footerLogoURL" | "faviconURL";

const MEDIA_FIELDS: { key: MediaKey; label: string }[] = [
  { key: "mainLogoURL", label: "Logo" },
  { key: "footerLogoURL", label: "Footer Logo" },
  { key: "faviconURL", label: "Favicon" },
];

const EMPTY: Record<MediaKey, string | null> = {
  mainLogoURL: null,
  footerLogoURL: null,
  faviconURL: null,
};

export default function MediaLinksForm() {
  const [entityId, setEntityId] = useState<string | null>(null);
  const [savedLinks, setSavedLinks] = useState<Record<MediaKey, string | null>>(EMPTY);
  const [links, setLinks] = useState<Record<MediaKey, string | null>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteKey, setDeleteKey] = useState<MediaKey | null>(null);

  useEffect(() => {
    fetchLinks(entityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const fetchLinks = async (businessEntityId: string | null) => {
    setLoading(true);
    try {
      const res = await getMediaLinks(businessEntityId);
      const mediaLinks = res?.data?.data?.mediaLinks;
      const next = {
        mainLogoURL: mediaLinks?.mainLogoURL || null,
        footerLogoURL: mediaLinks?.footerLogoURL || null,
        faviconURL: mediaLinks?.faviconURL || null,
      };
      setSavedLinks(next);
      setLinks(next);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load media links");
    } finally {
      setLoading(false);
    }
  };

  const hasPendingChanges = MEDIA_FIELDS.some((f) => links[f.key] !== savedLinks[f.key]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMediaLinks({ ...links, businessEntityId: entityId });
      setSavedLinks(links);
      toast.success("Media links updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update media links");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteKey) return;
    setLinks((prev) => ({ ...prev, [deleteKey]: null }));
    setDeleteKey(null);
  };

  const deleteLabel = MEDIA_FIELDS.find((f) => f.key === deleteKey)?.label ?? "";

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
              <BreadcrumbPage>Media Links</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <BusinessEntitySelect value={entityId} onChange={setEntityId} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MEDIA_FIELDS.map((f) => (
                <Skeleton key={f.key} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MEDIA_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <SingleImageUpload
                    imageUrl={links[f.key]}
                    onChange={(url) => {
                      if (url === null && links[f.key]) {
                        setDeleteKey(f.key);
                        return;
                      }
                      setLinks((prev) => ({ ...prev, [f.key]: url }));
                    }}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">512 x 512 px recommended</p>
                </Field>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 pt-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
            <Button onClick={handleSave} disabled={saving || loading || !hasPendingChanges}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteKey} onOpenChange={(open) => !open && setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteLabel.toLowerCase()}? It will be removed when you save changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
