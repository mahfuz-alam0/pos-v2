"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { updateFinalizedCount } from "@/services/liveInventory/updateFinalizedCount";

import { Input } from "@/components/ui/input";

interface LiveCountInputProps {
  livePackages: any[];
  sessionInfo: any;
  fetchLivePackages: () => void;
}

export default function LiveCountInput({ livePackages, sessionInfo, fetchLivePackages }: LiveCountInputProps) {
  const { shopId } = useShop();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const updateLiveCount = async (packageId: string, newCount: number) => {
    return updateFinalizedCount({ shopId, id: sessionInfo.id, packageId, finalizedCount: newCount });
  };

  const handleScanSearch = async (scanned: string) => {
    if (!scanned) return;
    const matched = livePackages.find((pkg) => pkg.advertisedId === scanned);
    if (!matched) return;

    const newCount = matched.finalizedCount + 1;
    try {
      const res = await updateLiveCount(matched.id.split(":")[1], newCount);
      if (res?.data?.success) {
        fetchLivePackages();
        setValue("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error updating count");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("Text").trim();
    setValue(pasted);
    setTimeout(() => handleScanSearch(pasted), 1000);
  };

  return (
    <Input
      ref={inputRef}
      className="mb-2 w-1/2"
      placeholder="Scan or Enter Barcode"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onPaste={handlePaste}
      onBlur={(e) => handleScanSearch(e.target.value.trim())}
    />
  );
}
