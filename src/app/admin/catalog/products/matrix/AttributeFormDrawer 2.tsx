"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Tag, Trash2, X } from "lucide-react";

import { createMatrixAttribute } from "@/services/matrixAttributes/create";
import { updateMatrixAttribute } from "@/services/matrixAttributes/update";
import { fetchSingleMatrixAttribute } from "@/services/matrixAttributes/getSingle";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/admin/form-fields";

type AttributeType = "color" | "text";

interface ColorField {
  name: string;
  code: string;
}

const TYPE_ITEMS = [
  { value: "color", label: "Color Variant" },
  { value: "text", label: "Variation name" },
];

export default function AttributeFormDrawer({
  open,
  mode,
  attributeId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "add" | "edit";
  attributeId: string | number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [attributeType, setAttributeType] = useState<AttributeType | "">("");
  const [colorFields, setColorFields] = useState<ColorField[]>([{ name: "", code: "#000000" }]);
  const [textFields, setTextFields] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (mode === "add") {
      setName("");
      setDetails("");
      setAttributeType("");
      setColorFields([{ name: "", code: "#000000" }]);
      setTextFields([""]);
      return;
    }

    if (mode === "edit" && attributeId) {
      setLoading(true);
      fetchSingleMatrixAttribute(attributeId)
        .then((res) => {
          const a = res?.data;
          if (!a) {
            toast.error("Attribute not found");
            return;
          }
          setName(a.name ?? "");
          setDetails(a.details ?? "");
          const type = (a.type ?? "").toLowerCase() as AttributeType;
          setAttributeType(type);
          if (type === "color") {
            setColorFields((a.values ?? []).map((v: any) => ({ name: v.value, code: v.valueRepresentation ?? "#000000" })));
          } else {
            setTextFields((a.values ?? []).map((v: any) => v.value));
          }
        })
        .catch((err: any) => toast.error(err?.message || "Failed to load attribute"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, attributeId]);

  const handleTypeChange = (value: AttributeType) => {
    setAttributeType(value);
    if (value === "color") setColorFields([{ name: "", code: "#000000" }]);
    else setTextFields([""]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter attribute name");
      return;
    }
    if (!attributeType) {
      toast.error("Please select a type");
      return;
    }

    const values =
      attributeType === "color"
        ? colorFields.map((f) => ({ value: f.name, valueId: crypto.randomUUID(), valueRepresentation: f.code }))
        : textFields.map((f) => ({ value: f, valueId: crypto.randomUUID(), valueRepresentation: null }));

    const payload = { name, type: attributeType.toUpperCase(), details, values };

    setSaving(true);
    try {
      if (mode === "add") {
        await createMatrixAttribute(payload);
        toast.success("Attribute created successfully");
      } else {
        await updateMatrixAttribute(attributeId!, payload);
        toast.success("Attribute updated successfully");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save attribute");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Tag className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold leading-tight">
              {mode === "add" ? "Add Attribute" : "Edit Attribute"}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              {mode === "add" ? "Create a new matrix attribute" : "Update attribute details"}
            </div>
          </div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Attribute name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter attribute name" />
              </Field>

              <Field label="Attribute Type" required>
                <Select
                  items={TYPE_ITEMS}
                  value={attributeType || undefined}
                  onValueChange={(v) => handleTypeChange(v as AttributeType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {attributeType === "color" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Color Variants</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setColorFields([...colorFields, { name: "", code: "#000000" }])}
                    >
                      <Plus /> Add Color
                    </Button>
                  </div>
                  {colorFields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Enter color variant"
                        value={field.name}
                        onChange={(e) => {
                          const fields = [...colorFields];
                          fields[index] = { ...fields[index], name: e.target.value };
                          setColorFields(fields);
                        }}
                      />
                      <input
                        type="color"
                        value={field.code}
                        onChange={(e) => {
                          const fields = [...colorFields];
                          fields[index] = { ...fields[index], code: e.target.value };
                          setColorFields(fields);
                        }}
                        className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setColorFields(colorFields.filter((_, i) => i !== index))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {attributeType === "text" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variation names</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setTextFields([...textFields, ""])}>
                      <Plus /> Add
                    </Button>
                  </div>
                  {textFields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Enter variation name"
                        value={field}
                        onChange={(e) => {
                          const fields = [...textFields];
                          fields[index] = e.target.value;
                          setTextFields(fields);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setTextFields(textFields.filter((_, i) => i !== index))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Field label="Description">
                <Textarea rows={4} placeholder="Enter description" value={details} onChange={(e) => setDetails(e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
