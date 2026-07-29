"use client";

import { TextField, ColorField, GroupCard, GroupLabel, CtaBlock } from "../ui/SharedFields";
import type { SectionComponentProps } from "./SectionPanel";

export default function AboutSection({ data, sectionKey, onChange }: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  const updateBodyText = (index: number, value: string) => {
    const updated = [...(data.bodyText || ["", ""])];
    updated[index] = value;
    set("bodyText", updated);
  };

  return (
    <div className="flex flex-col gap-6">
      <GroupCard>
        <GroupLabel>Text Content</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField label="Title" value={data.title} onChange={(v) => set("title", v)} />
          <TextField label="Accent Title" value={data.accentTitle} onChange={(v) => set("accentTitle", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Body Text</GroupLabel>
        <div className="flex flex-col gap-4">
          <TextField label="Paragraph 1" value={data.bodyText?.[0]} multiline onChange={(v) => updateBodyText(0, v)} />
          <TextField label="Paragraph 2" value={data.bodyText?.[1]} multiline onChange={(v) => updateBodyText(1, v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Call to Actions</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CtaBlock title="Primary CTA" value={data.ctaPrimary} onChange={(v) => set("ctaPrimary", v)} />
          <CtaBlock title="Secondary CTA" value={data.ctaSecondary} onChange={(v) => set("ctaSecondary", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Location</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField label="Latitude" value={data.location?.latitude ?? ""} onChange={(v) => set("location", { ...data.location, latitude: v })} />
          <TextField label="Longitude" value={data.location?.longitude ?? ""} onChange={(v) => set("location", { ...data.location, longitude: v })} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background Color" value={data.bgColor} onChange={(v) => set("bgColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
