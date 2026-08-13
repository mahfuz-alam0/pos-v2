"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  Camera,
  CloudUpload,
  Upload,
  IdCard,
  RefreshCcw,
  UserPlus,
  Pencil,
  Check,
  Mail,
  Phone,
  Loader2,
  Plus,
} from "lucide-react";
import { useShop } from "@/context/shop-context";
import { parseDLBarcode, formatDLDate } from "@/lib/aamva";
import {
  decodeBarcodeFromImage,
  decodeVideoFrame,
  preloadZXing,
  loadImageFromSrc,
} from "@/lib/dlBarcode";
import { uploadAnySingleFile } from "@/services/storage/uploadFile";
import { findCustomersByLicense, findCustomersByInfoString } from "@/services/customers/lookup";
import { addCustomerToQueue } from "@/services/customerQueue/add";
import { updateCustomerInfo } from "@/services/customers/updateCustomer";
import { getSingleCustomer } from "@/services/customers/getSingleCustomer";
import AddCustomerForm from "@/components/customers/AddCustomerForm";
import AnimatedDrawer from "@/components/ui/AnimatedDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Per-mode behavior copied from the old POS components:
// dl-front  → driving-license-ocr.js  (pill tabs, upload default, manual capture)
// dl-back   → scan-dl-barcode.js      (pill tabs, camera default, AUTO live scan)
// med-id    → ocr.js                  (radio selector, plain upload button)
const MODE_CONFIG = {
  "dl-front": {
    title: "Driver's License — Front",
    confirmTitle: "Confirm Driver's License Information",
    defaultTab: "upload",
    tabOrder: ["upload", "camera"],
    selector: "pills",
    liveScan: false,
    tag: "CAMERA",
    side: "front of the DL",
    uploadHint: "showing your face and details",
    cameraHintTop: "Hold the front of the DL steady in frame.",
    cameraHintSub: "Tap Capture when the card is clear.",
  },
  "dl-back": {
    title: "Scan Driver's License Barcode",
    confirmTitle: "Scanned DL Information",
    defaultTab: "camera",
    tabOrder: ["camera", "upload"],
    selector: "pills",
    liveScan: true,
    tag: "AUTO SCAN",
    side: "back of the DL",
    uploadHint: "showing the PDF417 barcode",
    cameraHintTop: "Hold the back of the DL steady in frame — it scans automatically.",
    cameraHintSub: "Barcode on the lower-left of the card back.",
  },
  "med-id": {
    title: "Upload Medical License ID",
    confirmTitle: "Confirm Medical License Information",
    defaultTab: "upload",
    tabOrder: ["upload", "camera"],
    selector: "radio",
    liveScan: false,
    tag: "CAMERA",
    side: "medical ID card",
    uploadHint: "showing the patient details",
    cameraHintTop: "Hold the medical ID steady in frame.",
    cameraHintSub: "Tap Capture when the card is clear.",
  },
};

const FIELD_LABELS = {
  licenseId: "License ID",
  medicalLicense: "Medical License",
  firstName: "First Name",
  lastName: "Last Name",
  dob: "Date of Birth",
  sex: "Sex",
  expiry: "Expiry Date",
  address: "Address",
  postal_code: "Postal Code",
  city: "City",
  state: "State",
  email: "Email",
  phone: "Phone",
};

// Existing (matched) customers get an email/phone row too — the scanned DL
// never has those, only the customer record does.
function fieldGroupsFor(mode, customerExists) {
  return [
    [mode === "med-id" ? "medicalLicense" : "licenseId", "firstName", "lastName"],
    ["dob", "sex", "expiry"],
    ["address"],
    ["postal_code", "city", "state"],
    ...(customerExists ? [["email", "phone"]] : []),
  ];
}

function dataUrlToFile(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const contentType = meta.match(/data:(.*?);/)?.[1] || "image/png";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], `license_${Date.now()}.${contentType.split("/")[1]}`, {
    type: contentType,
  });
}

// formData field -> customer record field, for saving a single inline edit
// (address fields nest under locationDetails).
function applyFieldToCustomer(customer, field, value, mode) {
  const next = { ...customer };
  switch (field) {
    case "licenseId":
      next.drivingLicense = value;
      break;
    case "medicalLicense":
      next.medicalLicense = value;
      break;
    case "expiry":
      if (mode === "med-id") next.medicalLicenseExpiresAt = value;
      else next.drivingLicenseExpiry = value;
      break;
    case "address":
      next.locationDetails = { ...next.locationDetails, streetAddress: value };
      break;
    case "postal_code":
      next.locationDetails = { ...next.locationDetails, zipCode: value };
      break;
    case "city":
      next.locationDetails = { ...next.locationDetails, city: value };
      break;
    case "state":
      next.locationDetails = { ...next.locationDetails, state: value };
      break;
    default:
      // firstName, lastName, dob, sex, email, phone map 1:1
      next[field] = value;
  }
  return next;
}

// The update endpoint validates a full customer payload, not a sparse
// single-field patch (mirrors AddCustomerForm's buildPayload, sourced from
// the customer record instead of form state — same field names either way).
function buildFullCustomerPayload(customer, shopId) {
  return {
    email: customer.email || undefined,
    firstName: customer.firstName,
    lastName: customer.lastName || undefined,
    countryCode: "US",
    sex: customer.sex || undefined,
    phone: customer.phone ? `+${String(customer.phone).replace(/^\+/, "")}` : undefined,
    locationDetails: {
      country: "US",
      city: customer.locationDetails?.city || undefined,
      state: customer.locationDetails?.state || undefined,
      streetAddress: customer.locationDetails?.streetAddress || undefined,
      zipCode: customer.locationDetails?.zipCode || undefined,
    },
    mjMedicalData: customer.mjMedicalData || undefined,
    customerGroupIds: (customer.customerGroups || [])
      .map((g) => (typeof g === "string" ? g : g?.id))
      .filter(Boolean),
    note: customer.note || undefined,
    dob: customer.dob || undefined,
    drivingLicense: customer.drivingLicense || undefined,
    drivingLicenseExpiry: customer.drivingLicenseExpiry || undefined,
    medicalLicense: customer.medicalLicense || undefined,
    customerTypeId: customer.customerTypeId || "",
    isLocked: !!customer.isLocked,
    shouldWarnUser: !!customer.shouldWarnUser,
    warningMessage: customer.shouldWarnUser ? customer.warningMessage : null,
    shopId,
    referralSource: customer.referralSource || null,
    avatarUrl: customer.avatarUrl || undefined,
    documentLinks: customer.documentLinks || [],
  };
}

const nameTokens = (o) => (`${o?.firstName || ""} ${o?.lastName || ""}`.toLowerCase().match(/[a-z]+/g) || []);

// Same person, tolerating a middle name on one side only and a different
// first/last word split (older records split multi-word given names
// differently) — but never a different name.
function sameName(customer, scan) {
  const a = nameTokens(customer);
  const b = nameTokens(scan);
  if (!a.length || !b.length) return false;
  return a.every((t) => b.includes(t)) || b.every((t) => a.includes(t));
}

function normalizeOcrDoc(doc, isMedId) {
  return {
    licenseId: isMedId ? "" : doc.license_no || "",
    medicalLicense: isMedId ? doc.medical_license || doc.license_no || "" : "",
    firstName: (doc.first_name || "").trim(),
    lastName: (doc.last_name || "").trim(),
    dob: doc.dob ? formatDLDate(doc.dob) : "",
    sex: doc.gender || "",
    expiry: doc.expiry_date ? formatDLDate(doc.expiry_date) : "",
    address: doc.address || "",
    city: doc.city || "",
    state: doc.state || "",
    postal_code: doc.postal_code || "",
  };
}

export default function PhotoCheckinDialog({ open, onOpenChange, mode = "dl-front" }) {
  const { shopId } = useShop();
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG["dl-front"];

  const [tab, setTab] = useState(cfg.defaultTab);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editingField, setEditingField] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [customerExists, setCustomerExists] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  // Field currently being saved to the matched customer's record (inline
  // pencil-edit on the confirmation screen).
  const [savingField, setSavingField] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileInputRef = useRef(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const liveScanningRef = useRef(false);

  function stopCamera() {
    liveScanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function resetAll() {
    stopCamera();
    setTab(cfg.defaultTab);
    setLoading(false);
    setLoadingMsg("");
    setCapturedImage(null);
    setCameraError(null);
    setScanError(null);
    setShowConfirmation(false);
    setFormData({});
    setEditingField(null);
    setCustomer(null);
    setCustomerExists(false);
    setQueueLoading(false);
    setDragOver(false);
    setFacingMode("environment");
    setAddCustomerOpen(false);
    setSavingField(null);
  }

  useEffect(() => {
    if (!open) {
      resetAll();
    } else {
      setTab(cfg.defaultTab);
      // Pre-load the WASM binary so the first decode is instant
      if (mode === "dl-back") preloadZXing();
    }
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Camera stream + live scan loop
  useEffect(() => {
    if (!open || tab !== "camera" || capturedImage || showConfirmation || loading) return;
    let cancelled = false;

    (async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);

        if (cfg.liveScan) {
          liveScanningRef.current = true;
          // Each tick now walks every crop band in one pass (see dlBarcode.ts),
          // so ticks are paced by requestAnimationFrame — as fast as the
          // browser can go — instead of a fixed 350ms wait per single band.
          const loop = async () => {
            if (cancelled || !liveScanningRef.current) return;
            const video = videoRef.current;
            const raw = await decodeVideoFrame(video).catch(() => null);
            if (cancelled || !liveScanningRef.current) return;
            if (raw) {
              const capCanvas = document.createElement("canvas");
              capCanvas.width = video.videoWidth;
              capCanvas.height = video.videoHeight;
              capCanvas.getContext("2d").drawImage(video, 0, 0);
              const dataUrl = capCanvas.toDataURL("image/jpeg", 0.92);
              stopCamera();
              setCapturedImage(dataUrl);
              await processRawText(raw);
              return;
            }
            requestAnimationFrame(loop);
          };
          loop();
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError("Unable to access camera. Check permissions and try again.");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, facingMode, capturedImage, showConfirmation, loading]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    stopCamera();
    setCapturedImage(dataUrl);
    processImage(dataUrl);
  }

  function handleFile(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => processImage(fr.result);
    fr.readAsDataURL(file);
  }

  async function lookupAndShow(data) {
    setFormData(data);
    let found = [];
    if (data.licenseId || data.medicalLicense) {
      found = await findCustomersByLicense({
        shopId,
        drivingLicense: data.licenseId || undefined,
        medicalLicense: data.medicalLicense || undefined,
      }).catch(() => []);
    }
    // Name lookups can hand back someone else entirely: the list API drops
    // the firstName filter server-side, and the DOB retry below matches
    // anyone born that day. Both paths are only usable once the returned
    // record's name is checked against the scan.
    if (!found?.length) {
      found = (
        await findCustomersByInfoString({
          shopId,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
        }).catch(() => [])
      )?.filter((c) => sameName(c, data));
    }
    // Customers added before the FN/LN extraction fix may be stored under a
    // different first/last split than today's scan produces (a multi-word
    // given name that used to get its last word misfiled as the surname).
    // DOB alone is unaffected by that, so retry on it — but the hit still has
    // to be the same human, since a DOB collides across customers freely.
    if (!found?.length && data.dob) {
      const byDob = await findCustomersByInfoString({ shopId, dob: data.dob }).catch(() => []);
      found = (byDob || []).filter((c) => sameName(c, data));
    }
    let matched = found?.[0] || null;
    // The list-lookup response is abbreviated — fetch the full record so
    // inline edits below have every field the update endpoint needs (it
    // validates a complete customer payload, not a sparse patch).
    if (matched?.id) {
      const full = await getSingleCustomer(matched.id).catch(() => null);
      matched = full?.data?.data?.customer || matched;
    }
    setCustomer(matched);
    setCustomerExists(Boolean(matched));
    // The scan never carries email/phone — pull those from the matched
    // customer's own record so they're editable inline too.
    if (matched) {
      setFormData((prev) => ({ ...prev, email: matched.email || "", phone: matched.phone || "" }));
    }
    setShowConfirmation(true);
  }

  async function processRawText(raw) {
    setLoading(true);
    setLoadingMsg("Reading barcode… Please wait.");
    try {
      const data = parseDLBarcode(raw);
      if (!data) {
        setScanError("Could not read DL data from the barcode. Try again.");
        setCapturedImage(null);
        return;
      }
      setLoadingMsg("Checking for existing customer…");
      await lookupAndShow(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function processImage(dataUrl) {
    setLoading(true);
    setScanError(null);
    try {
      let data = null;

      if (mode === "dl-back") {
        setLoadingMsg("Decoding barcode… Please wait.");
        const img = await loadImageFromSrc(dataUrl);
        const raw = await decodeBarcodeFromImage(img);
        if (!raw) {
          setScanError("No barcode found. Try a clearer, well-lit photo of the card back.");
          setCapturedImage(null);
          setLoading(false);
          return;
        }
        data = parseDLBarcode(raw);
      } else {
        setLoadingMsg("Uploading image… Please wait.");
        const uploaded = await uploadAnySingleFile(dataUrlToFile(dataUrl));
        setLoadingMsg(
          mode === "med-id" ? "Processing medical ID… Please wait." : "Processing license… Please wait."
        );
        const res = await fetch("/api/azure-docscan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ img: uploaded.downloadUrl }),
        });
        const json = await res.json();
        if (!res.ok || !(json?.status === 200 || json?.fields || json?.doc)) {
          throw new Error(json?.message || "Failed to extract information");
        }
        data = normalizeOcrDoc(json.doc || {}, mode === "med-id");
      }

      if (!data || (!data.firstName && !data.lastName && !data.licenseId && !data.medicalLicense)) {
        toast.error("Failed to extract information. Please try again with a clearer image.");
        setLoading(false);
        return;
      }

      setLoadingMsg("Checking for existing customer…");
      await lookupAndShow(data);
    } catch (err) {
      console.error("Check-in processing error:", err);
      toast.error(err.message || "Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCustomerToQueue() {
    const customerId = customer?.id || customer?._id;
    if (!customerId || queueLoading) return;
    setQueueLoading(true);
    try {
      await addCustomerToQueue({ shopId, customerId, isAnonymous: false });
      toast.success("Customer added to queue");
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to add customer to queue");
    } finally {
      setQueueLoading(false);
    }
  }

  function handleBackToUpload() {
    setShowConfirmation(false);
    setCapturedImage(null);
    setEditingField(null);
    setScanError(null);
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  function renderLoading() {
    return (
      <div className="flex min-h-110 w-full flex-col items-center justify-center gap-4">
        <div className="size-8 animate-spin rounded-full border-2 border-[#1890ff] border-t-transparent" />
        <p className="m-0 text-sm text-muted-foreground">{loadingMsg}</p>
      </div>
    );
  }

  function renderUploadContent() {
    if (loading) return renderLoading();

    // med-id keeps the old simple centered upload button
    if (mode === "med-id") {
      return (
        <div className="flex w-full justify-center py-7.5">
          <Button
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            className="border-[#1890ff] text-[#1890ff]"
          >
            <Upload /> Upload Medical License Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              handleFile(f);
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex w-full justify-center">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
            dragOver
              ? "border-[#1890ff] bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          <IdCard className="mx-auto mb-3 size-12 text-[#1890ff]" />
          <div className="mb-1 text-[15px] font-semibold text-gray-900">Drop your photo here</div>
          <div className="mb-4 text-[13px] text-gray-400">or click to browse</div>
          <Button className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90">
            <Upload /> Select Photo
          </Button>
          <div className="mt-3.5 text-xs text-gray-300">
            Take a clear photo of the <strong className="text-gray-400">{cfg.side}</strong>{" "}
            {cfg.uploadHint}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              handleFile(f);
            }}
          />
        </div>
      </div>
    );
  }

  function renderCameraControls() {
    return (
      <div
        className={`flex items-center justify-between gap-2 ${cfg.liveScan ? "mb-3.5" : "mt-4"}`}
      >
        <Button
          variant="outline"
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
        >
          <RefreshCcw /> {facingMode === "environment" ? "Front Cam" : "Back Cam"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={capturePhoto}
          disabled={!cameraReady}
          className="border-[#1890ff] text-[#1890ff]"
        >
          <Camera /> {cfg.liveScan ? "Capture Manually" : "Capture Image"}
        </Button>
      </div>
    );
  }

  function renderCameraContent() {
    if (loading) return renderLoading();

    if (capturedImage) {
      return (
        <>
          <div className="relative mx-auto h-110 w-full max-w-400 overflow-hidden rounded-xl bg-[#0a0a0a] shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
            <img src={capturedImage} alt="Captured" className="h-full w-full rounded-xl bg-black object-contain" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setCapturedImage(null)}>
              Try Again
            </Button>
            <Button
              className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90"
              onClick={() => processImage(capturedImage)}
            >
              Process Again
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <style>{`
          @keyframes dlFrontScanAnim {
            0%   { top: 14%; opacity: 0; }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { top: 82%; opacity: 0; }
          }
          @keyframes dlFrontPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>

        {/* dl-back places controls above the preview (old tablet-fold fix) */}
        {cfg.liveScan && renderCameraControls()}

        <div className="relative mx-auto h-110 w-full max-w-400 overflow-hidden rounded-xl bg-[#0a0a0a] shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
          <video ref={videoRef} autoPlay playsInline muted className="block h-full w-full object-cover" />

          <div className="pointer-events-none absolute top-[12%] right-[4%] bottom-[12%] left-[4%] rounded-[10px] border-[1.5px] border-dashed border-[rgba(24,144,255,0.45)]" />

          {[
            { top: "12%", left: "4%", borderWidth: "2px 0 0 2px" },
            { top: "12%", right: "4%", borderWidth: "2px 2px 0 0" },
            { bottom: "12%", left: "4%", borderWidth: "0 0 2px 2px" },
            { bottom: "12%", right: "4%", borderWidth: "0 2px 2px 0" },
          ].map((pos, i) => (
            <div key={i} className="absolute h-5 w-5 rounded-sm border-solid border-[#1890ff]" style={pos} />
          ))}

          {cameraReady && (
            <div
              className="pointer-events-none absolute right-[5%] left-[5%] h-0.5"
              style={{
                background: "linear-gradient(90deg, transparent, #1890ff 20%, #1890ff 80%, transparent)",
                boxShadow: "0 0 12px 2px rgba(24,144,255,0.7)",
                animation: "dlFrontScanAnim 2.2s ease-in-out infinite",
              }}
            />
          )}

          {cameraReady && (
            <div
              className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-[20px] border border-[#1890ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#1890ff]"
              style={{ background: "rgba(24,144,255,0.15)", backdropFilter: "blur(4px)" }}
            >
              <span
                className="inline-block size-1.75 rounded-full bg-[#1890ff]"
                style={{ animation: "dlFrontPulse 1.2s ease-in-out infinite" }}
              />
              {cfg.tag}
            </div>
          )}

          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
              <div className="size-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="text-sm text-white">Starting camera…</span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
              <Camera className="size-10 text-[#ff4d4f]" />
              <span className="text-sm font-semibold text-white">{cameraError}</span>
            </div>
          )}
        </div>

        <p className="mt-2.5 text-center text-[13px] leading-relaxed text-[#8c8c8c]">
          {cfg.cameraHintTop}
          <br />
          <span className="text-xs">{cfg.cameraHintSub}</span>
        </p>

        {scanError && (
          <div className="mt-2 rounded-lg border border-[#ffccc7] bg-[#fff2f0] px-3 py-2 text-center text-[13px] text-[#cf1322]">
            {scanError}
          </div>
        )}

        {!cfg.liveScan && renderCameraControls()}
      </>
    );
  }

  // Confirming a field's edit: for the new-customer path this is just local
  // state (Add Customer creates it below), but once a customer is already
  // matched there's nothing left to "Add" — save straight to their record.
  async function commitFieldEdit(field) {
    const value = formData[field] || "";
    const customerId = customer?.id || customer?._id;
    if (!customerExists || !customerId) {
      setEditingField(null);
      return;
    }
    setSavingField(field);
    try {
      const updatedCustomer = applyFieldToCustomer(customer, field, value, mode);
      await updateCustomerInfo(customerId, buildFullCustomerPayload(updatedCustomer, shopId));
      setCustomer(updatedCustomer);
      toast.success(`${FIELD_LABELS[field]} updated`);
      setEditingField(null);
    } catch (err) {
      toast.error(err?.message || `Failed to update ${FIELD_LABELS[field]}`);
    } finally {
      setSavingField(null);
    }
  }

  async function handleAvatarFile(file) {
    const customerId = customer?.id || customer?._id;
    if (!file || !customerId || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const uploaded = await uploadAnySingleFile(file);
      if (!uploaded?.downloadUrl) throw new Error("Failed to upload image");
      const updatedCustomer = { ...customer, avatarUrl: uploaded.downloadUrl };
      await updateCustomerInfo(customerId, buildFullCustomerPayload(updatedCustomer, shopId));
      setCustomer(updatedCustomer);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile picture");
    } finally {
      setAvatarUploading(false);
    }
  }

  function renderFieldValue(field) {
    const value = formData[field] || "";
    if (editingField === field) {
      return (
        <div className="flex items-center gap-1.5">
          <Input
            type={field === "dob" || field === "expiry" ? "date" : "text"}
            value={value}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))}
            className="h-8 flex-1"
            disabled={savingField === field}
          />
          <Button
            size="icon-sm"
            className="shrink-0"
            disabled={savingField === field}
            onClick={() => commitFieldEdit(field)}
          >
            <Check />
          </Button>
        </div>
      );
    }
    return value || "";
  }

  function renderConfirmationView() {
    const initials =
      [formData.firstName?.[0], formData.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?";

    const groups = fieldGroupsFor(mode, customerExists);
    const colClass = (group) =>
      group.length === 1 ? "w-full" : group.length === 2 ? "w-[49%]" : "w-[32%]";

    return (
      <div className="mt-8 w-full">
        <div className="mb-3 flex items-center gap-4">
          {customerExists ? (
            <button
              type="button"
              onClick={() => avatarFileInputRef.current?.click()}
              disabled={avatarUploading}
              className="group relative size-25 shrink-0 cursor-pointer rounded-full disabled:cursor-wait"
              title="Click to upload a profile picture"
            >
              {customer?.avatarUrl ? (
                <>
                  <img
                    src={customer.avatarUrl}
                    alt=""
                    className="size-25 shrink-0 rounded-full object-cover ring-2 ring-[#52c41a]"
                  />
                  {/* Existing photo: always-visible edit badge, not hover-only
                      — hover doesn't exist on the tablets this dialog runs on. */}
                  <div className="absolute -right-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#52c41a] text-white shadow-sm dark:border-[#1c2027]">
                    {avatarUploading ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40" />
                  )}
                </>
              ) : (
                // No photo on file yet: show the "+" upload affordance
                // outright instead of initials, so it reads as a button.
                <div className="flex size-25 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#52c41a] bg-[#f6ffed] text-[#52c41a]">
                  {avatarUploading ? <Loader2 className="size-7 animate-spin" /> : <Plus className="size-8" />}
                </div>
              )}
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  handleAvatarFile(f);
                }}
              />
            </button>
          ) : customer?.avatarUrl ? (
            <img
              src={customer.avatarUrl}
              alt=""
              className="size-25 shrink-0 rounded-full object-cover ring-2"
              style={{ "--tw-ring-color": "#1890ff" } as CSSProperties}
            />
          ) : (
            <div
              className="flex size-25 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: "#1890ff" }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1">
            {customerExists ? (
              <div className="w-full rounded-lg border-l-4 border-[#52c41a] bg-[#f6ffed] p-4">
                <span className="font-semibold text-[#52c41a]">Customer found: </span>
                <span className="text-gray-700">
                  {customer?.firstName} {customer?.lastName} — Add to queue to continue.
                </span>
                {(customer?.email || customer?.phone) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                    {customer?.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" /> {customer.email}
                      </span>
                    )}
                    {customer?.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" /> {customer.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full rounded-lg border-l-4 border-[#1890ff] bg-[#e6f7ff] p-4">
                <span className="font-semibold text-gray-900">New customer. </span>
                <span className="text-gray-700">Add them to the system to continue.</span>
              </div>
            )}
          </div>

          <Button variant="outline" className="mt-2 self-center" onClick={handleBackToUpload}>
            Back
          </Button>
        </div>

        <div className="mt-5">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4 flex w-full justify-between">
              {group.map((field) => (
                <div key={field} className={`${colClass(group)} mb-2`}>
                  <div className="relative flex h-full flex-col rounded border border-gray-100 p-2">
                    <span className="mb-1 font-semibold text-text">{FIELD_LABELS[field]}:</span>
                    <div className="flex-1 text-sm text-muted-foreground">{renderFieldValue(field)}</div>
                    {editingField !== field && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="absolute top-0.5 right-0.5"
                        onClick={() => setEditingField(field)}
                      >
                        <Pencil />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 flex w-full justify-between">
          {customerExists ? (
            <div className="flex w-full justify-end gap-2">
              <Button
                size="lg"
                className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90"
                disabled={queueLoading}
                onClick={handleAddCustomerToQueue}
              >
                {queueLoading ? "Adding…" : "Add to Queue"}
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-end">
              <Button
                size="lg"
                className="bg-[#1890ff] text-white hover:bg-[#1890ff]/90"
                onClick={() => setAddCustomerOpen(true)}
              >
                <UserPlus /> Add Customer
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSelector() {
    const tabMeta = {
      upload: { label: "Upload Photo", Icon: CloudUpload },
      camera: { label: "Camera", Icon: Camera },
    };

    if (cfg.selector === "radio") {
      // med-id keeps the old centered radio selector
      return (
        <div className="mt-2.5 mb-7.5 flex w-full justify-center gap-6">
          {cfg.tabOrder.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="medid-capture-mode"
                checked={tab === key}
                onChange={() => {
                  setTab(key);
                  setCapturedImage(null);
                  setCameraError(null);
                }}
                className="size-4 accent-[#1890ff]"
              />
              {key === "upload" ? "Upload" : "Camera"}
            </label>
          ))}
        </div>
      );
    }

    return (
      <div className="mb-5 flex w-full overflow-hidden rounded-[10px] border border-[#e8e8e8]">
        {cfg.tabOrder.map((key) => {
          const { label, Icon } = tabMeta[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setCapturedImage(null);
                setCameraError(null);
              }}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 border-none py-2.5 text-sm transition-all duration-180"
              style={{
                fontWeight: tab === key ? 600 : 400,
                background: tab === key ? "#1890ff" : "#fff",
                color: tab === key ? "#fff" : "#595959",
              }}
            >
              <Icon className="size-4" /> {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <AnimatedDrawer
        open={open}
        onClose={() => onOpenChange(false)}
        title={showConfirmation ? cfg.confirmTitle : cfg.title}
      >
        <div className="mx-auto flex w-full max-w-412.5 flex-col items-center p-0">
          {showConfirmation ? (
            renderConfirmationView()
          ) : (
            <>
              {renderSelector()}
              <div className="w-full">{tab === "upload" ? renderUploadContent() : renderCameraContent()}</div>
            </>
          )}
        </div>
      </AnimatedDrawer>

      <AddCustomerForm
        open={addCustomerOpen}
        zIndex={80}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={() => {
          setAddCustomerOpen(false);
          onOpenChange(false);
        }}
        initialValues={{
          firstName: formData.firstName || "",
          lastName: formData.lastName || "",
          dob: formData.dob || "",
          drivingLicense: mode === "med-id" ? "" : formData.licenseId || "",
          drivingLicenseExpiry: mode === "med-id" ? "" : formData.expiry || "",
          medicalLicense: mode === "med-id" ? formData.medicalLicense || "" : "",
          medicalLicenseExpiresAt: mode === "med-id" ? formData.expiry || "" : "",
          streetAddress: formData.address || "",
          city: formData.city || "",
          state: formData.state || "",
          zipCode: formData.postal_code || "",
        }}
      />
    </>
  );
}
