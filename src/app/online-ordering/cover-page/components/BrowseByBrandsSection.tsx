"use client";

import { Store } from "lucide-react";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import { BgPatternImageUpload } from "../ui/ImageUpload";
import IdListWithInventoryCheck from "../ui/IdListWithInventoryCheck";
import type { SectionComponentProps } from "./SectionPanel";

interface Props extends SectionComponentProps {
  shopId?: string | number | null;
  brandFetchPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  resolveBrandName: (id: string) => string;
}

export default function BrowseByBrandsSection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
  shopId, brandFetchPage, resolveBrandName,
}: Props) {
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
          <TextField label="Label" value={data.label} onChange={(v) => set("label", v)} />
          <TextField label="Title" value={data.title} onChange={(v) => set("title", v)} />
          <TextField label="Accent Title" value={data.accentTitle} onChange={(v) => set("accentTitle", v)} />
          <TextField label="Subtitle" value={data.subtitle} onChange={(v) => set("subtitle", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Brands</GroupLabel>
        <IdListWithInventoryCheck
          label="Brands"
          addLabel="Add Brand"
          icon={Store}
          value={Array.isArray(data.brandIds) ? data.brandIds : []}
          onChange={(v) => set("brandIds", v)}
          resolveName={resolveBrandName}
          fetchPage={brandFetchPage}
          inventoryParamKey="brandIds"
          shopId={shopId}
        />
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ColorField label="Primary Color" value={data.primaryColor} onChange={(v) => set("primaryColor", v)} />
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Secondary Color" value={data.secondaryColor} onChange={(v) => set("secondaryColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
