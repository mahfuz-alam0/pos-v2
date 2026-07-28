"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, Plus, Clock, Trash2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TextField, ColorField, GroupCard, GroupLabel } from "../ui/SharedFields";
import { normalizeReview, EMPTY_REVIEW, nowTimestamp } from "../ui/reviewHelpers";
import type { SectionComponentProps } from "./SectionPanel";

interface Props extends SectionComponentProps {
  onReindexReviewUploads: (sectionKey: string, removedIndex: number) => void;
}

export default function ReviewsSection({
  data, sectionKey, onChange,
  onQueue, onRemovePending, onReindexReviewUploads,
  pendingUploads, saving,
}: Props) {
  const set = (field: string, value: any) => onChange(sectionKey, field, value);
  const reviews = Array.isArray(data.reviews) ? data.reviews.map(normalizeReview) : [];
  const [editingReviewIndex, setEditingReviewIndex] = useState<number | null>(null);

  const updateReview = (index: number, field: string, value: string) => {
    const updated = [...reviews];
    updated[index] = { ...updated[index], [field]: value };
    set("reviews", updated);
  };

  const addReview = () => {
    set("reviews", [...reviews, { ...EMPTY_REVIEW, time: nowTimestamp() }]);
    setEditingReviewIndex(reviews.length);
  };

  const removeReview = (index: number) => {
    setEditingReviewIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
    onReindexReviewUploads?.(sectionKey, index);
    set("reviews", reviews.filter((_: any, i: number) => i !== index));
  };

  useEffect(() => {
    if (editingReviewIndex !== null && editingReviewIndex >= reviews.length) {
      setEditingReviewIndex(null);
    }
  }, [editingReviewIndex, reviews.length]);

  return (
    <div className="flex flex-col gap-6">
      <GroupCard>
        <GroupLabel>Rating Info</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <TextField label="Google Rating" value={data.googleRating} onChange={(v) => set("googleRating", v)} />
          <TextField label="Rating Label" value={data.ratingLabel} onChange={(v) => set("ratingLabel", v)} />
          <TextField label="Badge Label" value={data.badgeLabel} onChange={(v) => set("badgeLabel", v)} />
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Reviews</GroupLabel>
        <div className="flex flex-col gap-3.5">
          {reviews.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3">
              <span className="text-xs text-muted-foreground">No reviews yet. Click Add Review to create one.</span>
            </div>
          )}
          {reviews.map((review: any, index: number) => {
            const uploadKey = `${sectionKey}::reviews::${index}`;
            const pending = pendingUploads[uploadKey] || [];
            const isEditing = editingReviewIndex === index;
            const displayText = (review.review || "").trim();
            const previewText = displayText ? displayText.slice(0, 90) : "No review text";

            if (!isEditing) {
              return (
                <div key={`review-${index}`} className="rounded-[10px] bg-background px-4 py-3 ring-1 ring-foreground/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {review.image ? (
                        <img src={review.image} alt={review.name || "Reviewer"} className="size-10 shrink-0 rounded-full object-cover ring-1 ring-foreground/10" />
                      ) : (
                        <div className="size-10 shrink-0 rounded-full bg-muted" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{review.name || `Review ${index + 1}`}</span>
                          {review.rating && <Badge variant="secondary" className="text-[11px]">{review.rating}</Badge>}
                          {review.time && <span className="text-xs text-muted-foreground">{review.time}</span>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {previewText}{displayText.length > 90 ? "..." : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-auto p-0" onClick={() => setEditingReviewIndex(index)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-auto p-0 text-destructive hover:text-destructive" onClick={() => removeReview(index)}>Delete</Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={`review-${index}`} className="rounded-[10px] bg-background px-3.5 pt-3.5 pb-2.5 ring-1 ring-foreground/10">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold">Editing review {index + 1}</span>
                  <Button size="sm" variant="ghost" className="h-auto p-0" onClick={() => setEditingReviewIndex(null)}>Done</Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <TextField label="Name" value={review.name} onChange={(v) => updateReview(index, "name", v)} />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <TextField label="Time" value={review.time} onChange={(v) => updateReview(index, "time", v)} />
                    <TextField label="Rating" value={review.rating} onChange={(v) => updateReview(index, "rating", v)} />
                  </div>
                  <TextField label="Review" multiline value={review.review} onChange={(v) => updateReview(index, "review", v)} />

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Image</span>
                    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-2 border-dashed border-muted-foreground/25 bg-background p-6 text-center hover:bg-muted/30">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={saving}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!file.type?.startsWith("image/")) {
                            toast.error("Only image files are allowed.");
                          } else if (file.size / 1024 / 1024 >= 25) {
                            toast.error("Image must be smaller than 25MB.");
                          } else {
                            onQueue(uploadKey, file, true);
                          }
                          e.target.value = "";
                        }}
                      />
                      <Inbox className="size-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Upload reviewer image</p>
                    </label>

                    {pending.length > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <img src={pending[0].previewUrl} alt="Pending" className="size-10 rounded object-cover ring-1 ring-primary/40" />
                        <span className="flex items-center gap-1 text-xs text-primary"><Clock className="size-3.5" /> Pending</span>
                        <Button size="sm" variant="ghost" className="h-auto p-0 text-destructive hover:text-destructive" onClick={() => onRemovePending(uploadKey, pending[0].id)}>
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      </div>
                    )}

                    {review.image && pending.length === 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <img src={review.image} alt="Saved" className="size-10 rounded object-cover ring-1 ring-foreground/10" />
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3.5" /> Saved</span>
                        <Button size="sm" variant="ghost" className="h-auto p-0 text-destructive hover:text-destructive" onClick={() => updateReview(index, "image", "")}>
                          <Trash2 className="size-3.5" /> Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeReview(index)}>
                      <Trash2 className="size-4" /> Remove Review
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <Button variant="outline" onClick={addReview} className="self-start">
            <Plus className="size-4" /> Add Review
          </Button>
        </div>
      </GroupCard>

      <GroupCard>
        <GroupLabel>Colors</GroupLabel>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <ColorField label="Accent Color" value={data.accentColor} onChange={(v) => set("accentColor", v)} />
          <ColorField label="Background Color" value={data.bgColor} onChange={(v) => set("bgColor", v)} />
          <ColorField label="Review Avatar Color" value={data.reviewAvatarColor} onChange={(v) => set("reviewAvatarColor", v)} />
        </div>
      </GroupCard>
    </div>
  );
}
