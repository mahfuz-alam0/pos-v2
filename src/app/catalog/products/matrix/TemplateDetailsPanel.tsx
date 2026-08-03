"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchSingleProductMatrix } from "@/services/productMatrices/getSingle";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { TemplateRow } from "./types";

export default function TemplateDetailsPanel({
  templateId,
  onClose,
  onEdit,
}: {
  templateId: string | number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSingleProductMatrix(templateId);
      setTemplate(res?.data ?? null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load matrix");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex w-1/3 shrink-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">Matrix Details</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="outline" size="icon" onClick={onClose} className="size-7 shrink-0">
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <div className="h-px bg-border" />

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : template ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-muted-foreground">Name:</span>
                  <span className="flex-1 text-sm font-medium">{template.name ?? "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-muted-foreground">Created At:</span>
                  <span className="flex-1 text-sm">
                    {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : "-"}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 shrink-0 text-sm text-muted-foreground">Description:</span>
                  <span className="flex-1 text-sm">{template.details ?? "-"}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Images:</span>
                {template.images && template.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {template.images.map((image, index) => (
                      <img
                        key={index}
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        className="aspect-square w-full rounded-lg object-cover ring-1 ring-foreground/10"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-sm">-</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Associated Attributes:</span>
                {template.associatedAttributes && template.associatedAttributes.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {template.associatedAttributes.map((attribute) => (
                      <div key={attribute.id}>
                        <div className="mb-1 text-sm font-medium">{attribute.name}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {attribute.values.map((value, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ring-foreground/10"
                              style={value.valueRepresentation ? { backgroundColor: value.valueRepresentation, color: "#fff" } : undefined}
                            >
                              {value.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm">-</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">Associated Products:</span>
                {template.associatedProducts && template.associatedProducts.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {template.associatedProducts.map((product) => (
                      <div key={product.id} className="text-sm">
                        {product.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm">-</span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">Matrix not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
