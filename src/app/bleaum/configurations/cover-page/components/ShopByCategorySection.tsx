"use client";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import CategoryWithIconField from "../ui/CategoryWithIconField";
import type { SectionComponentProps } from "./SectionPanel";

interface Props extends SectionComponentProps {
  shopId?: string | number | null;
  categoryFetchPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  resolveCategoryName: (id: string) => string;
}

export default function ShopByCategorySection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
  shopId, categoryFetchPage, resolveCategoryName,
}: Props) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

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
        <GroupLabel>Categories with Icons</GroupLabel>
        <CategoryWithIconField
          value={data.categoryIds || []}
          onChange={(v) => set("categoryIds", v)}
          fetchPage={categoryFetchPage}
          resolveName={resolveCategoryName}
          onQueueImage={onQueue}
          pendingUploads={pendingUploads}
          onRemovePendingImage={onRemovePending}
          sectionKey={sectionKey}
          saving={saving}
          shopId={shopId}
        />
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
