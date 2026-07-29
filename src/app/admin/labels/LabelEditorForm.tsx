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
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

import { LabelFieldMap, isReceiptType, type LabelFieldDef } from "./labelFieldMap";
import type { LabelModel, PrintTemplate } from "./types";

const DEFAULT_CUSTOM_LABEL = "PACKAGE_LABEL";

interface FieldState extends LabelFieldDef {
  selected: boolean;
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
      return { ...f, selected: excluded.length > 0 ? !excluded.includes(f.id) : autoSelect };
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
      if (!target) return prev;

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
    if (labelType !== "PACKAGE_LABEL") return false;
    if (field.id === "package_barcode") {
      return !!fields.find((f) => f.id === "package_id_qr")?.selected && !field.selected;
    }
    if (field.id === "package_id_qr") {
      return !!fields.find((f) => f.id === "package_barcode")?.selected && !field.selected;
    }
    return false;
  };

  function renderPreview() {
    if (!previewRef.current) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template?.templateHtml) {
      previewRef.current.innerHTML = "";
      return;
    }

    const container = document.createElement("div");
    container.innerHTML = template.templateHtml;

    fields.forEach((field) => {
      const target = container.querySelector(`#d-${field.id}`) || container.querySelector(`#container-${field.id}`);
      if (!field.selected) {
        target?.remove();
        return;
      }
      if (!target) return;

      if (field.type === "barcode" || field.type === "qr") {
        target.innerHTML = `<div style="background:#f0f0f0;font-style:italic;padding:5px;text-align:center;font-size:10px;">[${field.type.toUpperCase()}: ${field.testValue ?? ""}]</div>`;
      } else {
        target.innerHTML = field.testValue ?? "";
      }
    });

    previewRef.current.innerHTML = "";
    previewRef.current.appendChild(container);
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

  const relevantTemplates = templates.filter((t) => t.type === labelType);

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
              <BreadcrumbItem>
                <BreadcrumbPage>Labels</BreadcrumbPage>
              </BreadcrumbItem>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-4 p-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <Input disabled={!!labelId} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field label="Label Type" required>
              <Select value={labelType} disabled>
                <SelectTrigger className="w-full">
                  <SelectValue />
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
                    <SelectValue placeholder="Select Template" />
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full (all digits)</SelectItem>
                    <SelectItem value="5">Last 5 digits</SelectItem>
                    <SelectItem value="8">Last 8 digits</SelectItem>
                    <SelectItem value="10">Last 10 digits</SelectItem>
                    <SelectItem value="12">Last 12 digits</SelectItem>
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
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      field.selected && !disabled
                        ? "border-primary bg-primary text-primary-foreground"
                        : disabled
                          ? "cursor-not-allowed border-muted-foreground/20 bg-muted text-muted-foreground/60"
                          : "border-input hover:bg-muted"
                    }`}
                  >
                    {field.label}
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

        {selectedTemplateId && (
          <Card className="gap-3 p-4">
            <p className="text-sm font-semibold">Preview</p>
            <div
              className={`overflow-auto rounded-lg ring-1 ring-foreground/10 ${isReceiptType(labelType) ? "max-h-[600px]" : ""}`}
            >
              <div ref={previewRef} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
