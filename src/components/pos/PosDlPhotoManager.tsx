"use client";

import { useEffect, useRef, useState } from "react";
import { FileImage, IdCard, ScanLine, Camera, Upload, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import SkeletonLoader from "@/components/pos/SkeletonLoader";

import { uploadFile } from "@/utils/uploadFile";
import { updateCustomerInfo } from "@/services/customers/updateCustomer";

// Ported from pos-dl-photo-manager.js — driver's-license / med-ID photo
// capture + upload, saved onto the customer profile.
//
// DEPENDENCY FLAG: the old file used `react-easy-crop` (Cropper) for an
// interactive drag/zoom crop step. That library is NOT installed here and was
// NOT added (per the porting brief — flag, don't silently add). Camera capture
// uses the native `getUserMedia` API (no library) and works fully. The crop
// step is replaced by a plain "Use Photo" confirm that uploads the captured /
// selected image as-is. If interactive cropping is required, install
// `react-easy-crop` and restore the crop step + getCroppedBlob() canvas helper
// from the old file (it needs the cropper's croppedAreaPixels).

const TYPES = [
  { key: "dl-front", label: "DL Front", description: "Front of driving license", Icon: FileImage },
  { key: "dl-back", label: "DL Back", description: "Back of driving license", Icon: FileImage },
  { key: "med-id", label: "Med ID", description: "Medical identification card", Icon: IdCard },
  { key: "scan-dl", label: "Scan DL", description: "Scan driving license barcode", Icon: ScanLine },
];

const FIELD_MAP = {
  "dl-front": "drivingLicenseFrontImage",
  "dl-back": "drivingLicenseBackImage",
  "med-id": "medicalLicenseImage",
};

function CameraCapture({ onCapture }) {
  const [captureMode, setCaptureMode] = useState("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode] = useState("environment");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    const startCamera = async () => {
      setCameraReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      } catch {
        toast.error("Unable to access camera. Use upload instead.");
        setCaptureMode("upload");
      }
    };

    if (captureMode === "camera") startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureMode, facingMode]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg", 0.95));
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onCapture(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant={captureMode === "camera" ? "default" : "outline"}
          onClick={() => setCaptureMode("camera")}
        >
          <Camera /> Camera
        </Button>
        <Button
          variant={captureMode === "upload" ? "default" : "outline"}
          onClick={() => setCaptureMode("upload")}
        >
          <Upload /> Upload
        </Button>
      </div>

      {captureMode === "camera" ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="max-h-[50vh] w-full" />
          </div>
          <Button className="w-full" disabled={!cameraReady} onClick={capturePhoto}>
            Capture
          </Button>
        </div>
      ) : (
        <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed">
          <Upload className="mb-2" />
          <span className="text-sm text-muted-foreground">Click to select an image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

export default function PosDlPhotoManager({ open, onClose, onScanDL, customer, uploadOnly }) {
  // "menu" | "capture" | "confirm" | "processing" | "upload-done"
  const [step, setStep] = useState("menu");
  const [selectedType, setSelectedType] = useState(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [procMsg, setProcMsg] = useState("");
  const [error, setError] = useState(null);
  const [localCustomer, setLocalCustomer] = useState(customer);

  const reset = () => {
    setStep("menu");
    setSelectedType(null);
    setCapturedDataUrl(null);
    setError(null);
    setProcMsg("");
  };

  useEffect(() => {
    if (open) setLocalCustomer(customer);
    else reset();
  }, [open, customer]);

  const selectType = (type) => {
    if (type.key === "scan-dl") {
      onClose();
      onScanDL?.();
      return;
    }
    setSelectedType(type);
    setStep("capture");
  };

  const handleCapture = (dataUrl) => {
    setCapturedDataUrl(dataUrl);
    setStep("confirm");
  };

  const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

  const processPhotoUpload = async () => {
    setStep("processing");
    setError(null);
    try {
      setProcMsg("Uploading photo…");
      const blob = await dataUrlToBlob(capturedDataUrl);
      const filename = `${selectedType.key}-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });
      const downloadUrl = await uploadFile(file);

      if (localCustomer?.id) {
        setProcMsg("Saving to customer profile…");
        const field = FIELD_MAP[selectedType.key];

        // customerGroups may be full objects — backend expects plain ID strings
        const rawGroups = localCustomer.customerGroupIds ?? localCustomer.customerGroups ?? [];
        const customerGroupIds = rawGroups
          .map((g) => (typeof g === "string" ? g : g?.id))
          .filter(Boolean);

        const isValidStr = (v) => v && v !== "null" && v !== "undefined";
        const rawPhone = localCustomer.phone;
        const phone = isValidStr(rawPhone)
          ? rawPhone.startsWith("+")
            ? rawPhone
            : `+${rawPhone}`
          : undefined;
        const countryCode = isValidStr(localCustomer.countryCode)
          ? localCustomer.countryCode
          : undefined;
        const locationDetails =
          localCustomer.locationDetails &&
          typeof localCustomer.locationDetails === "object" &&
          Object.keys(localCustomer.locationDetails).length > 0
            ? localCustomer.locationDetails
            : { country: "", city: "", state: "", streetAddress: "", zipCode: "" };

        await updateCustomerInfo(localCustomer.id, {
          firstName: localCustomer.firstName || localCustomer.name || "Customer",
          lastName: localCustomer.lastName ?? undefined,
          email: localCustomer.email,
          sex: localCustomer.sex,
          countryCode,
          phone,
          locationDetails,
          customerGroupIds,
          isLocked: Boolean(localCustomer.isLocked),
          dob: localCustomer.dob,
          drivingLicense: localCustomer.drivingLicense,
          drivingLicenseExpiry: localCustomer.drivingLicenseExpiry,
          mjMedicalData: localCustomer.mjMedicalData,
          documentLinks: localCustomer.documentLinks ?? [],
          ...(field
            ? { [field]: downloadUrl }
            : { documentLinks: [...(localCustomer.documentLinks || []), downloadUrl] }),
        });

        if (field) setLocalCustomer((prev) => ({ ...prev, [field]: downloadUrl }));
        toast.success(`${selectedType.label} saved to customer profile`);
      } else {
        toast.success(`${selectedType.label} uploaded — select a customer to attach it`);
      }
      setStep("upload-done");
    } catch {
      setError("Upload failed. Please try again.");
      setStep("confirm");
    }
  };

  const stepTitles = {
    menu: "Document Manager",
    capture: selectedType?.label ? `Capture — ${selectedType.label}` : "Capture Photo",
    confirm: "Confirm Photo",
    processing: "Processing…",
    "upload-done": "Upload Complete",
  };

  const canGoBack = ["capture", "confirm", "upload-done"].includes(step);
  const goBack = () => {
    if (step === "capture") setStep("menu");
    else if (step === "confirm") setStep("capture");
    else if (step === "upload-done") reset();
  };

  const types = uploadOnly ? TYPES.filter((t) => t.key !== "scan-dl") : TYPES;

  return (
    <Drawer open={open} onClose={onClose} side="right" size={480}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-4 flex items-center gap-2">
          {canGoBack && (
            <Button size="icon" variant="ghost" onClick={goBack}>
              <ArrowLeft />
            </Button>
          )}
          <span className="text-lg font-semibold">{stepTitles[step]}</span>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === "menu" && (
            <div className="grid grid-cols-2 gap-3">
              {types.map((type) => (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => selectType(type)}
                  className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left hover:bg-muted"
                >
                  <type.Icon />
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </button>
              ))}
            </div>
          )}

          {step === "capture" && <CameraCapture onCapture={handleCapture} />}

          {step === "confirm" && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedDataUrl} alt="Captured document" className="w-full rounded-lg" />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("capture")}>
                  Retake
                </Button>
                <Button className="flex-1" onClick={processPhotoUpload}>
                  Use Photo
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="space-y-3">
              <SkeletonLoader rows={3} />
              <p className="text-center text-sm text-muted-foreground">{procMsg}</p>
            </div>
          )}

          {step === "upload-done" && (
            <div className="space-y-3 text-center">
              <p className="text-sm">{selectedType?.label} uploaded successfully.</p>
              <Button onClick={reset}>Upload Another</Button>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
