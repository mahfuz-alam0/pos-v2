"use client";

import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import { SingleImageUpload, ArrayImageUpload } from "../ui/ImageUpload";
import type { SectionComponentProps } from "./SectionPanel";

export default function InstagramFeedSection({
  data, sectionKey, onChange, onQueue, onRemovePending, pendingUploads, saving,
}: SectionComponentProps) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);

  return (
    <div className="flex flex-col gap-6">
      <SingleImageUpload
        label="Profile Image (1:1)"
        uploadKey={`${sectionKey}::profileImageUrl`}
        value={data.profileImageUrl}
        saving={saving}
        onQueue={onQueue}
        onRemovePending={onRemovePending}
        onRemoveSaved={() => set("profileImageUrl", null)}
        pendingUploads={pendingUploads}
        requiredRatio={1}
        requiredRatioLabel="1:1"
      />

      <ArrayImageUpload
        label="Instagram Images (1:1)"
        uploadKey={`${sectionKey}::imageUrls`}
        values={data.imageUrls || []}
        saving={saving}
        onQueue={onQueue}
        onRemovePending={onRemovePending}
        onRemoveOne={(i) => set("imageUrls", (data.imageUrls || []).filter((_: any, idx: number) => idx !== i))}
        pendingUploads={pendingUploads}
        requiredRatio={1}
        requiredRatioLabel="1:1"
      />

      <GroupCard>
        <GroupLabel>Profile Info</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <TextField label="Handle" value={data.handle} onChange={(v) => set("handle", v)} />
          <TextField label="Profile URL" value={data.profileUrl} onChange={(v) => set("profileUrl", v)} />
          <TextField label="Posts Count" value={data.postsCount} onChange={(v) => set("postsCount", v)} />
          <TextField label="Followers Count" value={data.followersCount} onChange={(v) => set("followersCount", v)} />
          <TextField label="Following Count" value={data.followingCount} onChange={(v) => set("followingCount", v)} />
          <TextField label="Follow Label" value={data.followLabel} onChange={(v) => set("followLabel", v)} />
          <TextField label="Follow Href" value={data.followHref} onChange={(v) => set("followHref", v)} />
          <TextField label="View More Label" value={data.viewMoreLabel} onChange={(v) => set("viewMoreLabel", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background Color" value={data.bgColor} onChange={(v) => set("bgColor", v)} />
          <ColorField label="Handle Color" value={data.handleColor} onChange={(v) => set("handleColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
