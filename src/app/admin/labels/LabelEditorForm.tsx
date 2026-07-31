"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { fetchLabels } from "@/services/labels/list";
import { createLabel } from "@/services/labels/create";
import { updateLabel } from "@/services/labels/update";
import { fetchPrintTemplates } from "@/services/printTemplates/list";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

import { LabelFieldMap, isReceiptType, type LabelFieldDef } from "./labelFieldMap";
import type { LabelModel, PrintTemplate } from "./types";

const DEFAULT_CUSTOM_LABEL = "PACKAGE_LABEL";

const BARCODE_DIGIT_OPTIONS: Record<string, string> = {
  full: "Full (all digits)",
  "5": "Last 5 digits",
  "8": "Last 8 digits",
  "10": "Last 10 digits",
  "12": "Last 12 digits",
};

interface FieldState extends LabelFieldDef {
  selected: boolean;
  isAvailableInTemplate: boolean;
}

export default function LabelEditorForm({ labelId }: { labelId: string | null }) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(!!labelId);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [name, setName] = useState("");
  const [labelType, setLabelType] = useState<string>(DEFAULT_CUSTOM_LABEL);
  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [barcodeDigits, setBarcodeDigits] = useState("full");
  const [fields, setFields] = useState<FieldState[]>([]);

  useEffect(() => {
    loadTemplates();
    if (labelId) {
      populateLabel(labelId);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelId]);

  useEffect(() => {
    // Recompute which fields actually exist in the selected template's HTML.
    // For new labels, also auto-select fields (QR prioritized) the first time a template is chosen.
    const template = templates.find((t) => t.id === selectedTemplateId);
    const html = template?.templateHtml;
    if (!html || fields.length === 0) return;

    setFields((prev) =>
      prev.map((f) => {
        const isAvailableInTemplate = html.includes(`id="d-${f.id}"`) || html.includes(`id="container-${f.id}"`);
        if (isAvailableInTemplate === f.isAvailableInTemplate) return f;

        if (!labelId && isAvailableInTemplate) {
          const preferQr = labelType === "PACKAGE_LABEL" && (f.id === "package_id_qr" || f.type === "qr");
          return { ...f, isAvailableInTemplate, selected: preferQr ? true : f.selected };
        }
        return { ...f, isAvailableInTemplate };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    renderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, fields, templates]);

  function resetForm() {
    setName("");
    setLabelType(DEFAULT_CUSTOM_LABEL);
    setSelectedTemplateId(null);
    setBarcodeDigits("full");
    setFields(buildFields(DEFAULT_CUSTOM_LABEL, []));
  }

  function buildFields(type: string, excluded: string[]): FieldState[] {
    return (LabelFieldMap[type]?.fields ?? []).map((f) => {
      const autoSelect = type === "PACKAGE_LABEL" && (f.id === "package_id_qr" || f.type === "qr");
      return {
        ...f,
        selected: excluded.length > 0 ? !excluded.includes(f.id) : autoSelect,
        isAvailableInTemplate: true,
      };
    });
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    try {
      const res = await fetchPrintTemplates();
      setTemplates(res?.data ?? []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function populateLabel(id: string) {
    setLoading(true);
    try {
      const res = await fetchLabels();
      const label = (res?.data ?? []).find((l: LabelModel) => l.id === id);
      if (!label) {
        toast.error("Label not found");
        return;
      }
      setName(label.name);
      setLabelType(label.templateType);
      setSelectedTemplateId(label.templateId ?? null);
      setBarcodeDigits(label.meta?.barcodeDigits ?? "full");
      setFields(buildFields(label.templateType, label.fieldExclusions ?? []));
    } catch (err: any) {
      toast.error(err?.message || "Failed to load label");
    } finally {
      setLoading(false);
    }
  }

  const toggleField = (fieldId: string) => {
    setFields((prev) => {
      const target = prev.find((f) => f.id === fieldId);
      if (!target || !target.isAvailableInTemplate) return prev;

      // mutual exclusivity between barcode and QR for package labels
      if (labelType === "PACKAGE_LABEL" && !target.selected) {
        if (fieldId === "package_barcode") {
          return prev.map((f) =>
            f.id === fieldId ? { ...f, selected: true } : f.id === "package_id_qr" ? { ...f, selected: false } : f
          );
        }
        if (fieldId === "package_id_qr") {
          return prev.map((f) =>
            f.id === fieldId ? { ...f, selected: true } : f.id === "package_barcode" ? { ...f, selected: false } : f
          );
        }
      }

      return prev.map((f) => (f.id === fieldId ? { ...f, selected: !f.selected } : f));
    });
  };

  const isFieldDisabled = (field: FieldState) => {
    if (!field.isAvailableInTemplate) return true;
    if (labelType !== "PACKAGE_LABEL") return false;
    if (field.id === "package_barcode") {
      return !!fields.find((f) => f.id === "package_id_qr")?.selected && !field.selected;
    }
    if (field.id === "package_id_qr") {
      return !!fields.find((f) => f.id === "package_barcode")?.selected && !field.selected;
    }
    return false;
  };

  function getDimensionsWithUnit(dimensions: { width: number; height: number }, type: string) {
    if (isReceiptType(type)) {
      return { width: dimensions.width, height: dimensions.height, unit: "mm" };
    }
    return { width: dimensions.width, height: dimensions.height, unit: "in" };
  }

  async function renderPreview() {
    if (!previewRef.current) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template?.templateHtml) {
      previewRef.current.innerHTML = "";
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = template.templateHtml;

    const qrFields = fields.filter((f) => f.selected && f.type === "qr" && f.testValue);
    const qrUrls = await Promise.all(
      qrFields.map(async (field) => {
        try {
          const QRCode = await import("qrcode");
          return [field.id, await QRCode.toDataURL(field.testValue!, { width: 64, margin: 0 })] as const;
        } catch {
          return [field.id, null] as const;
        }
      })
    );
    const qrMap = new Map(qrUrls);

    fields.forEach((field) => {
      const target = container.querySelector(`#d-${field.id}`) || container.querySelector(`#container-${field.id}`);
      if (!field.selected) {
        target?.remove();
        return;
      }
      if (!target) return;

      if (field.type === "qr") {
        const qrUrl = qrMap.get(field.id);
        target.innerHTML = "";
        if (qrUrl) {
          const img = document.createElement("img");
          img.src = qrUrl;
          img.alt = "QR Code";
          img.style.width = "50px";
          img.style.height = "50px";
          img.style.display = "block";
          img.style.margin = "0 auto";
          target.appendChild(img);
        }
      } else if (field.type === "barcode") {
        // barcode rendering is handled by the template's own embedded markup
      } else {
        target.innerHTML = field.testValue ?? "";
      }
    });

    previewRef.current.innerHTML = "";
    previewRef.current.appendChild(container);
  }

  function handleTestPrint() {
    const node = previewRef.current;
    if (!node) return;
    const styleId = "label-editor-print-styles";
    document.getElementById(styleId)?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #label-editor-print-area, #label-editor-print-area * { visibility: visible; }
        #label-editor-print-area { position: absolute !important; left: 0 !important; top: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Please add labels name!");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Please select a template!");
      return;
    }

    setSubmitLoading(true);
    try {
      const body = {
        ...(labelId && { id: labelId }),
        name,
        templateId: selectedTemplateId,
        fieldExclusions: fields.filter((f) => !f.selected).map((f) => f.id),
        preferredModelType: labelId ? undefined : "PACKAGE_CATEGORY",
        meta: { barcodeDigits },
      };

      if (!labelId) {
        await createLabel(body);
        toast.success("Label created successfully.");
      } else {
        await updateLabel(body);
        toast.success("Label updated successfully.");
      }
      router.push("/admin/labels");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save label");
    } finally {
      setSubmitLoading(false);
    }
  }

  // pos-web-old shows every template in the dropdown regardless of type — match that.
  const relevantTemplates = templates;

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Labels</h1>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Labels</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{labelId ? "Edit Labels" : "New Label"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/labels")}>
          Back to Labels
        </Button>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <Card className="gap-4 p-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <Input disabled={!!labelId} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field label="Label Type" required>
              <Select value={labelType} disabled>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value) => LabelFieldMap[value]?.label ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(LabelFieldMap).map((key) => (
                    <SelectItem key={key} value={key}>
                      {LabelFieldMap[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Template" required>
              {templatesLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedTemplateId ?? undefined} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Template">
                      {(value) => templates.find((t) => t.id === value)?.name ?? "Select Template"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {relevantTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <span className="flex items-center gap-1.5">
                          {template.name}
                          {!template.shopId && (
                            <Badge variant="secondary" className="text-[10px]">
                              Built-in
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {labelType && !templatesLoading && relevantTemplates.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No relevant template for label type {LabelFieldMap[labelType]?.label}. Create one in the Templates
                  tab.
                </p>
              )}
            </Field>

            {labelType === "PACKAGE_LABEL" && (
              <Field label="Barcode / QR Digits">
                <Select value={barcodeDigits} onValueChange={setBarcodeDigits}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value) => BARCODE_DIGIT_OPTIONS[value] ?? value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BARCODE_DIGIT_OPTIONS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Field Options</p>
            <div className="flex flex-wrap gap-2">
              {fields.map((field) => {
                const disabled = isFieldDisabled(field);
                return (
                  <button
                    key={field.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleField(field.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                      field.selected && !disabled
                        ? "border-primary bg-primary text-primary-foreground"
                        : disabled
                          ? "cursor-not-allowed border-muted-foreground/20 bg-muted text-muted-foreground/60"
                          : "border-input hover:bg-muted"
                    }`}
                  >
                    {field.label}
                    {!field.isAvailableInTemplate && <span className="opacity-70">(not in template)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitLoading}>
              {submitLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </Card>

        {selectedTemplateId &&
          (() => {
            const PPI = 96; // CSS px per inch
            const templateDims = templates.find((t) => t.id === selectedTemplateId)?.dimensions;
            const d = getDimensionsWithUnit(templateDims || { width: 0, height: 0 }, labelType);
            const unitToPx = d.unit === "mm" ? PPI / 25.4 : PPI;
            const nativeW = Number(d.width) * unitToPx;
            const nativeH = Number(d.height) * unitToPx;

            const MAX_BOX = 320; // px cap the preview scales down to fit within
            const fitScale = Math.min(1, MAX_BOX / nativeW, MAX_BOX / nativeH);

            return (
              <Card className="gap-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Preview</p>
                  <Button variant="outline" size="sm" onClick={handleTestPrint}>
                    Test Print
                  </Button>
                </div>
                <div
                  className="overflow-hidden rounded-lg ring-1 ring-foreground/10"
                  style={{ width: nativeW * fitScale, height: nativeH * fitScale }}
                >
                  <div
                    style={{
                      width: nativeW,
                      height: nativeH,
                      transform: `scale(${fitScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <div
                      id="label-editor-print-area"
                      ref={previewRef}
                      style={{ width: `${d.width}${d.unit}`, height: `${d.height}${d.unit}` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })()}
      </div>
    </div>
  );
}
