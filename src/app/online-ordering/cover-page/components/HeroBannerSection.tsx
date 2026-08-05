"use client";

import { Switch } from "@/components/ui/switch";
import { TextField, ColorField, GroupCard, GroupLabel, CtaBlock } from "../ui/SharedFields";
import { ArrayMediaUpload } from "../ui/ImageUpload";
import type { SectionComponentProps } from "./SectionPanel";

export default function HeroBannerSection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
}: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  return (
    <div className="flex flex-col gap-6">
      <ArrayMediaUpload
        label="Web Banner (12:5) + Video"
        imageUploadKey={`${sectionKey}::bgImageUrls`}
        videoUploadKey={`${sectionKey}::videoUrls`}
        imageValues={data.bgImageUrls || []}
        videoValues={data.videoUrls || []}
        saving={saving}
        onQueueImage={onQueue}
        onQueueVideo={onQueue}
        onRemovePendingImage={onRemovePending}
        onRemovePendingVideo={onRemovePending}
        onRemoveOneImage={(i) => set("bgImageUrls", (data.bgImageUrls || []).filter((_: any, idx: number) => idx !== i))}
        onRemoveOneVideo={(i) => set("videoUrls", (data.videoUrls || []).filter((_: any, idx: number) => idx !== i))}
        pendingUploads={pendingUploads}
        requiredRatio={12 / 5}
        requiredRatioLabel="12:5"
      />

      <ArrayMediaUpload
        label="Mobile Banner (1:1) + Video"
        imageUploadKey={`${sectionKey}::mobileBanner`}
        videoUploadKey={`${sectionKey}::mobileVideoUrls`}
        imageValues={data.mobileBanner || []}
        videoValues={data.mobileVideoUrls || []}
        saving={saving}
        onQueueImage={onQueue}
        onQueueVideo={onQueue}
        onRemovePendingImage={onRemovePending}
        onRemovePendingVideo={onRemovePending}
        onRemoveOneImage={(i) => set("mobileBanner", (data.mobileBanner || []).filter((_: any, idx: number) => idx !== i))}
        onRemoveOneVideo={(i) => set("mobileVideoUrls", (data.mobileVideoUrls || []).filter((_: any, idx: number) => idx !== i))}
        pendingUploads={pendingUploads}
        requiredRatio={1}
        requiredRatioLabel="1:1"
      />

      <GroupCard>
        <GroupLabel>Gradient</GroupLabel>
        <div className="flex items-center gap-3">
          <Switch checked={!!data.gradientEnable} onCheckedChange={(v) => set("gradientEnable", v)} />
          <span className="text-[13px]">{data.gradientEnable ? "Gradient enabled" : "Gradient disabled"}</span>
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Text Content</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <TextField label="Label" value={data.label} onChange={(v) => set("label", v)} />
          <TextField label="Title" value={data.title} onChange={(v) => set("title", v)} />
          <TextField label="Bold Title" value={data.boldTitle} onChange={(v) => set("boldTitle", v)} />
          <TextField label="Accent Title" value={data.accentTitle} onChange={(v) => set("accentTitle", v)} />
          <TextField label="Subtitle" value={data.subtitle} onChange={(v) => set("subtitle", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Call to Actions</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CtaBlock title="Primary CTA" value={data.ctaPrimary} showColors onChange={(v) => set("ctaPrimary", v)} />
          <CtaBlock title="Secondary CTA" value={data.ctaSecondary} showColors onChange={(v) => set("ctaSecondary", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <ColorField label="Primary Color" value={data.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Secondary Color" value={data.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
