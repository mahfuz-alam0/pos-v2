"use client";

import { useState } from "react";
import { IdCard, ScanBarcode, FileImage, ScanLine, UserPlus } from "lucide-react";
import PhotoCheckinDialog from "@/components/settings/verify/PhotoCheckinDialog";
import ScanIdDialog from "@/components/settings/verify/ScanIdDialog";
import AddCustomerToQueue from "@/components/dashboard/AddCustomerToQueue";

// Dark-themed reskin of settings/VerifyTab for the Front Desk screen — same
// underlying dialogs (ScanIdDialog/PhotoCheckinDialog), old-app tile order and
// look. Settings keeps the light-themed VerifyTab as-is.
const CHECKIN_TYPES = [
  {
    key: "dl-back",
    label: "Driver's License Back / Barcode",
    description: "Scan barcode on back of driving license",
    icon: ScanBarcode,
  },
  {
    key: "dl-front",
    label: "Driver's License Front",
    description: "Upload or scan the front of DL",
    icon: FileImage,
  },
  {
    key: "med-id",
    label: "Med ID",
    description: "Scan or upload medical ID",
    icon: IdCard,
  },
  {
    key: "scan-dl",
    label: "Scan ID",
    description: "Directly scan driving license barcode",
    icon: ScanLine,
  },
];

function Tile({ type, onSelect }) {
  const Icon = type.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-[#141a2e] p-5 text-center transition-colors hover:border-violet-400/40 hover:bg-[#1a2140]"
    >
      <div className="flex size-11 items-center justify-center rounded-lg bg-violet-500/15">
        <Icon className="size-5 text-violet-300" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{type.label}</div>
        <div className="mt-0.5 text-xs text-white/50">{type.description}</div>
      </div>
    </button>
  );
}

export default function FrontDeskVerifyPanel({ shopId, onCheckedIn }) {
  const [photoMode, setPhotoMode] = useState(null);
  const [scanIdOpen, setScanIdOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  function handleSelect(type) {
    if (type.key === "scan-dl") setScanIdOpen(true);
    else setPhotoMode(type.key);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1224] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IdCard className="size-4.5 text-violet-300" />
          <h2 className="text-base font-semibold text-white">Verify &amp; Check-In</h2>
        </div>
        <button
          type="button"
          onClick={() => setAddCustomerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <UserPlus className="size-4" /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHECKIN_TYPES.map((t) => (
          <Tile key={t.key} type={t} onSelect={handleSelect} />
        ))}
      </div>

      <PhotoCheckinDialog open={Boolean(photoMode)} onOpenChange={(v) => !v && setPhotoMode(null)} mode={photoMode || "dl-front"} />
      <ScanIdDialog open={scanIdOpen} onOpenChange={setScanIdOpen} />
      <AddCustomerToQueue
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        shopId={shopId}
        queueData={[]}
        onCheckedIn={onCheckedIn}
      />
    </div>
  );
}
