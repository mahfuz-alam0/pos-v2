"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QRCode } from "react-qrcode-logo";
import { Pencil, QrCode, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { BusinessEntitySelect } from "./BusinessEntitySelect";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";
import { getAppDetails } from "@/services/appDetails/getAppDetails";
import { updateAppDetails } from "@/services/appDetails/updateAppDetails";
import { getApkRecord } from "@/services/apkRecords/getApkRecord";
import { updateApkRecord } from "@/services/apkRecords/updateApkRecord";
import { deleteApkRecord } from "@/services/apkRecords/deleteApkRecord";

interface Screenshot {
  url: string;
  name: string;
}

const emptyScreenshots = (): (Screenshot | null)[] => [null, null, null, null];

function FileButton({
  accept,
  onFileSelect,
  children,
  ...buttonProps
}: React.ComponentProps<typeof Button> & { accept: string; onFileSelect: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button {...buttonProps} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}

export default function ApkManagementTab() {
  const [entityId, setEntityId] = useState<string | null>(null);

  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");
  const [versionNumber, setVersionNumber] = useState("");
  const [minAge, setMinAge] = useState("18+");
  const [androidNumber, setAndroidNumber] = useState("");
  const [releasedOn, setReleasedOn] = useState("");
  const [downloads, setDownloads] = useState("");
  const [iosAppUrl, setIosAppUrl] = useState("");
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<(Screenshot | null)[]>(emptyScreenshots());
  const [screenshotError, setScreenshotError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    fetchAppDetails(entityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const fetchAppDetails = async (businessEntityId: string | null) => {
    setLoading(true);
    try {
      const res = await getAppDetails(businessEntityId);
      const app = res?.data?.data?.appDetails;
      if (app) {
        setAppName(app.name || "");
        setDescription(app.description || "");
        setVersionNumber(app.ongoingStableVersion || "");
        setMinAge(app.minimumAge ? `${app.minimumAge}+` : "18+");
        setAndroidNumber(app.minimumAndroidVersion || "");
        setReleasedOn(app.releasedDate ? app.releasedDate.slice(0, 10) : "");
        setDownloads(app.totalDownloads != null ? `${app.totalDownloads}+` : "");
        setIosAppUrl(app.iosAppUrl || "");
        setAppIcon(app.logoURL || null);

        const shots = emptyScreenshots();
        (app.previewImageUrls || []).forEach((url: string, i: number) => {
          if (i < 4 && url) shots[i] = { url, name: `screenshot-${i + 1}.png` };
        });
        setScreenshots(shots);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load app details");
    } finally {
      setLoading(false);
    }
  };

  const handleIconChange = async (file: File) => {
    const isImage = file.type === "image/jpeg" || file.type === "image/png";
    const isSmall = file.size / 1024 / 1024 < 2;
    if (!isImage) return toast.error("Only JPG/PNG allowed!");
    if (!isSmall) return toast.error("Image must be smaller than 2MB!");

    try {
      const result = await uploadAnySingleFile(file);
      setAppIcon(result?.downloadUrl || null);
      toast.success(`${file.name} uploaded successfully`);
    } catch {
      toast.error(`${file.name} upload failed.`);
    }
  };

  const handleScreenshotUpload = async (file: File, index: number) => {
    try {
      const result = await uploadAnySingleFile(file);
      setScreenshots((prev) => prev.map((s, i) => (i === index ? { url: result?.downloadUrl, name: file.name } : s)));
      toast.success("Screenshot uploaded successfully");
    } catch {
      toast.error("Screenshot upload failed");
    }
  };

  const handleDeleteScreenshot = (index: number) => {
    setScreenshots((prev) => prev.map((s, i) => (i === index ? null : s)));
  };

  const handleSubmit = async () => {
    const validCount = screenshots.filter(Boolean).length;
    if (validCount !== 4) {
      setScreenshotError(true);
      toast.error("Please upload all 4 required screenshots");
      return;
    }
    setScreenshotError(false);
    setSaving(true);
    try {
      const payload = {
        businessEntityId: entityId,
        logoURL: appIcon,
        name: appName,
        description,
        ongoingStableVersion: versionNumber,
        minimumAge: parseInt(minAge.replace("+", "") || "18", 10),
        minimumAndroidVersion: androidNumber,
        releasedDate: releasedOn || null,
        totalDownloads: parseInt(downloads.replace("+", "") || "0", 10),
        previewImageUrls: screenshots.filter(Boolean).map((s) => s!.url),
        iosAppUrl: iosAppUrl || null,
      };
      await updateAppDetails(payload);
      toast.success("App details updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update app details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">App Details</h2>
          <p className="text-sm text-muted-foreground">Manage your mobile app listing information</p>
        </div>
        <BusinessEntitySelect value={entityId} onChange={setEntityId} />
      </div>

      {/* Identity */}
      <Card>
        <CardContent className="flex flex-wrap gap-8">
          <div className="flex min-w-40 flex-col items-center gap-3">
            <div className="flex size-30 items-center justify-center overflow-hidden rounded-2xl bg-muted">
              {appIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={appIcon} alt="App Icon" className="size-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="size-6" />
                  <span className="text-[11px]">512 × 512</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <FileButton accept="image/jpeg,image/png" onFileSelect={handleIconChange} size="sm" variant={appIcon ? "outline" : "default"}>
                {appIcon ? <Pencil className="size-4" /> : <Upload className="size-4" />}
                {appIcon ? "Change" : "Upload"}
              </FileButton>
              {appIcon && (
                <Button size="icon" variant="destructive" onClick={() => setAppIcon(null)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <span className="text-center text-[11px] text-muted-foreground">App Icon · JPG/PNG · max 2 MB</span>
          </div>

          <div className="min-w-70 flex-1">
            <div className="mb-4 max-w-90">
              <Label className="mb-2 text-muted-foreground">App Name</Label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g. My Cannabis App" />
            </div>
            <div>
              <Label className="mb-2 text-muted-foreground">Description</Label>
              <RichTextEditor value={description} onChange={setDescription} placeholder="Enter your app description..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Metadata */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-2 text-muted-foreground">Version</Label>
            <Input value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} placeholder="e.g. 1.0.0" />
          </div>
          <div>
            <Label className="mb-2 text-muted-foreground">Min. Age</Label>
            <Input value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="e.g. 18+" />
          </div>
          <div>
            <Label className="mb-2 text-muted-foreground">Min. Android</Label>
            <Input value={androidNumber} onChange={(e) => setAndroidNumber(e.target.value)} placeholder="e.g. 8.0" />
          </div>
          <div>
            <Label className="mb-2 text-muted-foreground">Released On</Label>
            <Input type="date" value={releasedOn} onChange={(e) => setReleasedOn(e.target.value)} />
          </div>
          <div>
            <Label className="mb-2 text-muted-foreground">Downloads</Label>
            <Input value={downloads} onChange={(e) => setDownloads(e.target.value)} placeholder="e.g. 5000+" />
          </div>
          <div>
            <Label className="mb-2 text-muted-foreground">iOS App URL</Label>
            <div className="flex gap-1">
              <Input value={iosAppUrl} onChange={(e) => setIosAppUrl(e.target.value)} placeholder="https://apps.apple.com/..." />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => (iosAppUrl ? setQrOpen(true) : toast.error("Please enter iOS App URL first"))}
                title="Generate QR Code"
              >
                <QrCode className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots */}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center justify-between pb-2.5 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
            <div className="text-xs font-semibold tracking-wide text-primary uppercase">
              Screenshots <span className="font-normal text-muted-foreground normal-case">(4 required · 1080 × 1920 px)</span>
            </div>
            {screenshotError && <span className="text-sm text-destructive">Please upload all 4 required screenshots</span>}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {screenshots.map((shot, index) =>
              shot ? (
                <div key={index} className="relative overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.url} alt={shot.name} className="h-95 w-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button size="icon" variant="destructive" className="size-7" onClick={() => handleDeleteScreenshot(index)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                    <FileButton
                      accept="image/*"
                      onFileSelect={(file) => handleScreenshotUpload(file, index)}
                      size="icon"
                      className="size-7"
                    >
                      <Pencil className="size-3.5" />
                    </FileButton>
                  </div>
                </div>
              ) : (
                <label key={index} className="flex h-95 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/15 bg-muted/40 text-muted-foreground">
                  <Upload className="size-6" />
                  <span className="text-sm">Upload Screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleScreenshotUpload(e.target.files[0], index)}
                  />
                </label>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <ApkUpload selectedEntityId={entityId} />

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>iOS App QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2" id="ios-app-qrcode">
            <QRCode value={iosAppUrl} size={260} bgColor="#FFFFFF" fgColor="#000000" />
            <p className="text-center text-xs break-all text-muted-foreground">URL: {iosAppUrl}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const canvas = document.querySelector<HTMLCanvasElement>("#ios-app-qrcode canvas");
                if (!canvas) return;
                const link = document.createElement("a");
                link.href = canvas.toDataURL("image/png");
                link.download = "ios-app-qrcode.png";
                link.click();
              }}
            >
              Download QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApkUpload({ selectedEntityId }: { selectedEntityId: string | null }) {
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existing, setExisting] = useState<{ versionCode: string; downloadURL: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchApk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId]);

  const fetchApk = async () => {
    try {
      const res = await getApkRecord(selectedEntityId);
      const record = res?.data?.data?.apkRecord;
      if (record) {
        setExisting(record);
        setVersion(record.versionCode || "");
      } else {
        setExisting(null);
        setVersion("");
      }
    } catch {
      setExisting(null);
      setVersion("");
    }
  };

  const handleSave = async () => {
    if (!version) return toast.error("Please enter APK version");
    if (!file) return toast.error("Please upload APK file");

    setLoading(true);
    try {
      const uploaded = await uploadAnySingleFile(file);
      const res = await updateApkRecord({ versionCode: version, downloadURL: uploaded!.downloadUrl, businessEntityId: selectedEntityId });
      toast.success("APK saved successfully");
      setExisting(res?.data?.data?.apkRecord || res?.data?.data);
      setFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save APK");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteApkRecord(selectedEntityId);
      setVersion("");
      setFile(null);
      setExisting(null);
      toast.success("APK deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete APK");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="mb-4 pb-2.5 text-xs font-semibold tracking-wide text-primary uppercase shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">APK Management</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-2 text-muted-foreground">APK Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.2.0" />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-2 text-muted-foreground">APK File</Label>
            {file ? (
              <div className="flex w-fit items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm">
                <Upload className="size-4 text-emerald-600" />
                {file.name}
                <button type="button" onClick={() => setFile(null)}>
                  <X className="size-4 text-destructive" />
                </button>
              </div>
            ) : existing?.downloadURL ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                  <span>v{existing.versionCode}</span>
                  <a href={existing.downloadURL} target="_blank" rel="noreferrer" className="text-primary underline">
                    Download
                  </a>
                </div>
                <FileButton accept=".apk" onFileSelect={setFile} variant="outline" size="sm">
                  <Upload className="size-4" />
                  Replace File
                </FileButton>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">No APK found</span>
                <FileButton accept=".apk" onFileSelect={setFile} variant="outline" size="sm">
                  <Upload className="size-4" />
                  Choose APK File
                </FileButton>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="destructive" onClick={handleDelete} disabled={loading || (!existing && !file)}>
            Delete APK
          </Button>
          <Button onClick={handleSave} disabled={loading || !version || !file}>
            Save APK
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
