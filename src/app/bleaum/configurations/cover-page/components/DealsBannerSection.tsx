"use client";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import { BgPatternImageUpload } from "../ui/ImageUpload";
import type { SectionComponentProps } from "./SectionPanel";

export default function DealsBannerSection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
}: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  return (
    <div className="flex flex-col gap-6">
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
          <TextField label="CTA Label" value={data.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
          <TextField label="CTA Href" value={data.ctaHref} onChange={(v) => set("ctaHref", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <ColorField label="Primary Color" value={data.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background Color" value={data.bgColor} onChange={(v) => set("bgColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
