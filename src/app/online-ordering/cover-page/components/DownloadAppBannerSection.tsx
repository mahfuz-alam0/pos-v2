"use client";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import { SingleImageUpload, BgPatternImageUpload } from "../ui/ImageUpload";
import type { SectionComponentProps } from "./SectionPanel";

export default function DownloadAppBannerSection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
}: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  return (
    <div className="flex flex-col gap-6">
      <SingleImageUpload
        label="App Image"
        uploadKey={`${sectionKey}::imageUrl`}
        value={data.imageUrl}
        saving={saving}
        onQueue={onQueue}
        onRemovePending={onRemovePending}
        onRemoveSaved={() => set("imageUrl", null)}
        pendingUploads={pendingUploads}
      />

      <BgPatternImageUpload
        sectionKey={sectionKey}
        data={data}
        onChange={onChange}
        onQueue={onQueue}
        onRemovePending={onRemovePending}
        pendingUploads={pendingUploads}
        saving={saving}
      />

      <GroupCard>
        <GroupLabel>Text Content</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <TextField label="Title" value={data.title} onChange={(v) => set("title", v)} />
          <TextField label="Accent Title" value={data.accentTitle} onChange={(v) => set("accentTitle", v)} />
          <TextField label="Bold Title" value={data.boldTitle} onChange={(v) => set("boldTitle", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>App Store Links</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField label="iOS Link" value={data.iosLink} onChange={(v) => set("iosLink", v)} />
          <TextField label="Android Link" value={data.androidLink} onChange={(v) => set("androidLink", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background Color" value={data.bgColor} onChange={(v) => set("bgColor", v)} />
          <ColorField label="Gold Color" value={data.goldColor} onChange={(v) => set("goldColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
