"use client";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import type { SectionComponentProps } from "./SectionPanel";

export default function DealTypeSection({ data, sectionKey, onChange }: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  return (
    <div className="flex flex-col gap-6">
      <GroupCard>
        <GroupLabel>Text Content</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <TextField label="Label" value={data.label} onChange={(v) => set("label", v)} />
          <TextField label="Title" value={data.title} onChange={(v) => set("title", v)} />
          <TextField label="Accent Title" value={data.accentTitle} onChange={(v) => set("accentTitle", v)} />
          <TextField label="Subtitle" value={data.subtitle} onChange={(v) => set("subtitle", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <ColorField label="Primary Color" value={data.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background Color" value={data.bgColor} onChange={(v) => set("bgColor", v)} />
          <ColorField label="Secondary Color" value={data.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
