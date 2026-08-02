"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";

import { createPrintTemplate } from "@/services/printTemplates/create";
import { updatePrintTemplate } from "@/services/printTemplates/update";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

import TemplateFrameLoader from "./TemplateFrameLoader";
import { LabelFieldMap, PRESET_DIMENSIONS, isReceiptType } from "./labelFieldMap";
import type { PrintTemplate } from "./types";

interface TemplateEditorModalProps {
  open: boolean;
  templateData: PrintTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

type Screen = "config" | "editor" | "saving";

export default function TemplateEditorModal({ open, templateData, onClose, onSaved }: TemplateEditorModalProps) {
  const isEditing = !!templateData;

  const [screen, setScreen] = useState<Screen>("config");
  const [name, setName] = useState("");
  const [labelType, setLabelType] = useState("RECEIPT");
  const [width, setWidth] = useState("58");
  const [height, setHeight] = useState("200");
  const [margins, setMargins] = useState({ top: "0.1", right: "0.1", bottom: "0.1", left: "0.1" });
  const [selectedPreset, setSelectedPreset] = useState("receipt-58mm");
  const [showCustomDimensions, setShowCustomDimensions] = useState(false);
  const [formError, setFormError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScreen("config");
    setFormError(false);

    if (templateData) {
      setName(templateData.name);
      setLabelType(templateData.type);
      setWidth(templateData.dimensions?.width?.toString() ?? "58");
      setHeight(templateData.dimensions?.height?.toString() ?? "200");
      setMargins({
        top: templateData.margins?.top?.toString() ?? "0.1",
        right: templateData.margins?.right?.toString() ?? "0.1",
        bottom: templateData.margins?.bottom?.toString() ?? "0.1",
        left: templateData.margins?.left?.toString() ?? "0.1",
      });

      const matchingPreset = PRESET_DIMENSIONS.find(
        (p) => p.width.toString() === templateData.dimensions?.width?.toString() && p.height.toString() === templateData.dimensions?.height?.toString()
      );
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.id);
        setShowCustomDimensions(false);
      } else {
        setSelectedPreset("custom");
        setShowCustomDimensions(true);
      }
    } else {
      setName("");
      setLabelType("RECEIPT");
      setWidth("58");
      setHeight("200");
      setMargins({ top: "5", right: "5", bottom: "5", left: "5" });
      setSelectedPreset("receipt-58mm");
      setShowCustomDimensions(false);
    }
  }, [open, templateData]);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === "save") {
        await handleSave(e.data.templateData);
      } else if (e.data?.type === "cancel") {
        setScreen("config");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateData, isEditing, name, labelType, width, height, margins]);

  const dimensionUnit = isReceiptType(labelType) ? "mm" : "in";

  const handleTypeSelect = (type: string) => {
    setLabelType(type);
    const newPreset = isReceiptType(type) ? "receipt-58mm" : "label-2x1";
    setSelectedPreset(newPreset);
    const preset = PRESET_DIMENSIONS.find((p) => p.id === newPreset);
    if (preset) {
      setWidth(preset.width.toString());
      setHeight(preset.height.toString());
      setMargins(
        isReceiptType(type)
          ? { top: "5", right: "5", bottom: "5", left: "5" }
          : { top: "0.1", right: "0.1", bottom: "0.1", left: "0.1" }
      );
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === "custom") {
      setShowCustomDimensions(true);
      return;
    }
    setShowCustomDimensions(false);
    const preset = PRESET_DIMENSIONS.find((p) => p.id === value);
    if (preset) {
      setWidth(preset.width.toString());
      setHeight(preset.height.toString());
    }
  };

  const handleNext = () => {
    if (!height || !width || !name || !margins.top || !margins.right || !margins.bottom || !margins.left) {
      toast.error("Please fill all the required fields");
      setFormError(true);
      return;
    }
    setFormError(false);
    setScreen("editor");
  };

  async function handleSave(templateHtml: string) {
    try {
      setScreen("saving");

      const templateSize = new Blob([templateHtml]).size;
      if (templateSize > 1024 * 1024) {
        toast.error("Template size too large. Please reduce content or image size (max 400 x 400).");
        setScreen("editor");
        return;
      }

      const body = {
        name,
        type: labelType,
        height,
        width,
        marginTop: margins.top,
        marginBottom: margins.bottom,
        marginLeft: margins.left,
        marginRight: margins.right,
        templateHtml,
      };

      if (templateData && isEditing) {
        await updatePrintTemplate(templateData.id, body);
      } else {
        await createPrintTemplate(body);
      }

      toast.success(isEditing ? "Template updated successfully." : "Template created successfully.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save template. Please try again.");
      setScreen("editor");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {screen === "config" && (
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{isEditing ? "Edit Template" : "Add Template"}</h2>
            <Button variant="outline" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <Field label="Template Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template Name" />
          </Field>

          <Field label={`Dimensions (${dimensionUnit})`} required>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select preset dimensions" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_DIMENSIONS.filter((d) => (isReceiptType(labelType) ? d.unit === "mm" : d.unit === "in")).map(
                  (d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.width}x{d.height}
                      {d.unit})
                    </SelectItem>
                  )
                )}
                <SelectItem value="custom">Custom Dimensions</SelectItem>
              </SelectContent>
            </Select>

            {showCustomDimensions && (
              <div className="mt-2 flex gap-2">
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">Width ({dimensionUnit})</span>
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">Height ({dimensionUnit})</span>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
              </div>
            )}
          </Field>

          <Field label={`Margins (${dimensionUnit})`} required>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Top</span>
                <Input value={margins.top} onChange={(e) => setMargins({ ...margins, top: e.target.value })} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Right</span>
                <Input value={margins.right} onChange={(e) => setMargins({ ...margins, right: e.target.value })} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Bottom</span>
                <Input value={margins.bottom} onChange={(e) => setMargins({ ...margins, bottom: e.target.value })} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Left</span>
                <Input value={margins.left} onChange={(e) => setMargins({ ...margins, left: e.target.value })} />
              </div>
            </div>
          </Field>

          <Field label="Label Type" required>
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(LabelFieldMap).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTypeSelect(key)}
                  className={`relative flex h-20 items-center justify-center rounded-lg border p-2 text-center text-sm ${
                    labelType === key ? "border-primary ring-1 ring-primary" : "border-input hover:border-primary/50"
                  }`}
                >
                  {labelType === key && (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                  {LabelFieldMap[key].label}
                </button>
              ))}
            </div>
          </Field>

          {formError && (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Please fill up all required data
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleNext}>Next</Button>
          </div>
        </div>
      )}

      {screen === "editor" && (
        <TemplateFrameLoader
          width={width}
          height={height}
          dimensionUnit={dimensionUnit}
          type={labelType}
          margins={margins}
          isEditing={isEditing}
          templateData={templateData}
        />
      )}

      {screen === "saving" && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Saving Template</p>
        </div>
      )}
    </div>
  );
}
