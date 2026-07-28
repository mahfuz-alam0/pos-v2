"use client";

import { ArrayImageUpload } from "../ui/ImageUpload";
import type { SectionComponentProps } from "./SectionPanel";

export default function BannerSection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
}: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  return (
    <div className="flex flex-col gap-6">
      <ArrayImageUpload
        label="Banner Images (16:9)"
        uploadKey={`${sectionKey}::imageUrls`}
        values={data.imageUrls || []}
        saving={saving}
        onQueue={onQueue}
        onRemovePending={onRemovePending}
        onRemoveOne={(i) => set("imageUrls", (data.imageUrls || []).filter((_: any, idx: number) => idx !== i))}
        pendingUploads={pendingUploads}
        requiredRatio={16 / 9}
        requiredRatioLabel="16:9"
      />
    </div>
  );
}
