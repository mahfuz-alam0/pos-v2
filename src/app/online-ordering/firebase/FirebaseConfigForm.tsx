"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { getFirebaseConfig } from "@/services/firebase/getFirebaseConfig";
import { updateFirebaseConfig } from "@/services/firebase/updateFirebaseConfig";
import { deleteFirebaseConfig } from "@/services/firebase/deleteFirebaseConfig";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Field } from "@/components/admin/form-fields";
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

export default function FirebaseConfigForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [bucketName, setBucketName] = useState("");
  const [firebaseAppId, setFirebaseAppId] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [adminSDKJSON, setAdminSDKJSON] = useState<Record<string, any> | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchConfig(entityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const resetForm = () => {
    setBucketName("");
    setFirebaseAppId("");
    setFileName(null);
    setAdminSDKJSON(null);
    setHasExistingConfig(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const fetchConfig = async (businessEntityId: string | null) => {
    setLoading(true);
    resetForm();
    try {
      const res = await getFirebaseConfig(businessEntityId);
      const config = res?.data?.data?.firebaseConfig;
      if (config) {
        setHasExistingConfig(true);
        setBucketName((config.bucketName ?? "").replace(/^gs:\/\//, ""));
        setFirebaseAppId(config.firebaseAppId ?? "");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load existing configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("You can only upload a JSON file!");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setAdminSDKJSON(JSON.parse(e.target?.result as string));
      } catch {
        toast.error("Invalid JSON file");
        setAdminSDKJSON(null);
        setFileName(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleSave = async () => {
    if (!adminSDKJSON) return toast.error("Please upload Firebase Admin SDK Credentials JSON file");
    if (!bucketName.trim()) return toast.error("Please input the bucket name");
    if (!firebaseAppId.trim()) return toast.error("Please input the App ID");

    setSaving(true);
    try {
      await updateFirebaseConfig({
        adminSDKJSON,
        bucketName,
        firebaseAppId,
        businessEntityId: entityId,
      });
      toast.success("Firebase configuration updated successfully!");
      setHasExistingConfig(true);
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteFirebaseConfig(entityId);
      toast.success("Configuration deleted successfully");
      resetForm();
      setDeleteOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete configuration");
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
              <BreadcrumbPage>Configurations</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Firebase</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <BusinessEntitySelect value={entityId} onChange={setEntityId} />
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Firebase Admin SDK Credentials JSON" required>
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <Upload className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {fileName ?? "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground">JSON file only.</p>
                </div>
                {!adminSDKJSON && (
                  <p className="mt-1.5 text-xs text-destructive">
                    Firebase Admin SDK Credentials JSON is required
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Firebase Storage Bucket Name" required>
                  <div className="flex items-center rounded-lg border border-input bg-transparent dark:bg-input/30">
                    <span className="pl-3 text-sm text-muted-foreground">gs://</span>
                    <Input
                      value={bucketName}
                      onChange={(e) => setBucketName(e.target.value.replace(/^gs:\/\//, ""))}
                      placeholder="your-bucket-name"
                      className="border-none bg-transparent shadow-none focus-visible:shadow-none"
                    />
                  </div>
                </Field>

                <Field label="Firebase IOS App ID" required>
                  <Input
                    value={firebaseAppId}
                    onChange={(e) => setFirebaseAppId(e.target.value)}
                    placeholder="1:1234567890:web:abcd1234"
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2 pt-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
            {hasExistingConfig && (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={saving}>
                Delete Configuration
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : hasExistingConfig ? "Update Configuration" : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !open && !deleteLoading && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Firebase Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this configuration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
