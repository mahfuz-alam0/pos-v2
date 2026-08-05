"use client";

import { Star } from "lucide-react";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import IdListWithInventoryCheck from "../ui/IdListWithInventoryCheck";
import type { SectionComponentProps } from "./SectionPanel";

interface Props extends SectionComponentProps {
  shopId?: string | number | null;
  productFetchPage: (page: number, search: string) => Promise<{ items: { id: string; name: string }[]; totalPages: number }>;
  resolveProductName: (id: string) => string;
}

export default function FeaturedProductsSection({
  data, sectionKey, onChange,
  shopId, productFetchPage, resolveProductName,
}: Props) {
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
        <GroupLabel>Products</GroupLabel>
        <IdListWithInventoryCheck
          label="Products"
          addLabel="Add Product"
          icon={Star}
          value={Array.isArray(data.productIds) ? data.productIds : []}
          onChange={(v) => set("productIds", v)}
          resolveName={resolveProductName}
          fetchPage={productFetchPage}
          inventoryParamKey="includeProductIds"
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
