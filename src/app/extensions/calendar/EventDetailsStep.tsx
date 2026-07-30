import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimpleFileUpload, { type UploadedDoc } from "@/app/admin/inventory/packages/SimpleFileUpload";

import type { EntityOption } from "./types";

interface EventDetailsData {
  title: string;
  description: string;
  businessEntityId: string | null;
  existingImages: string[];
  files: UploadedDoc[];
}

export default function EventDetailsStep({
  data,
  onChange,
  errors,
  entities,
}: {
  data: EventDetailsData;
  onChange: (patch: Partial<EventDetailsData>) => void;
  errors: { title?: string | null; description?: string | null };
  entities: EntityOption[];
}) {
  return (
    <div className="max-h-[500px] space-y-6 overflow-y-auto">
      <div className="space-y-1.5">
        <Label>
          Event Title<span className="ml-1 text-destructive">*</span>
        </Label>
        <Input
          placeholder="Enter event title"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>
          Event Description<span className="ml-1 text-destructive">*</span>
        </Label>
        <Textarea
          placeholder="Describe your event in detail..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          aria-invalid={!!errors.description}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Business Entity</Label>
        <Select
          items={[{ value: "__none__", label: "None" }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
          value={data.businessEntityId ?? "__none__"}
          onValueChange={(v) => onChange({ businessEntityId: v === "__none__" ? null : (v as string) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.existingImages.length > 0 && (
        <div className="space-y-2">
          <Label>Existing Images</Label>
          <div className="flex flex-wrap gap-3">
            {data.existingImages.map((img, index) => (
              <div key={index} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-20 w-20 rounded-lg border object-cover" />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100"
                  onClick={() => onChange({ existingImages: data.existingImages.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Event Images</Label>
        <SimpleFileUpload files={data.files} onChange={(files) => onChange({ files })} accept="image/*" maxCount={5} />
      </div>
    </div>
  );
}
