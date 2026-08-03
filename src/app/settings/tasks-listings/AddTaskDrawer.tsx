"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { fetchTaskPriorities } from "@/services/tasks/taskPriorities";
import { createTask } from "@/services/tasks/createTask";
import { fetchScopedEmployeesPage } from "@/services/employees/paginatedScoped";

import Drawer from "@/components/ui/Drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ApiSelect } from "@/components/ui/api-select";
import { Field } from "@/components/admin/form-fields";

interface TaskPriority {
  priorityId: string;
  displayName: string;
  colorCode?: string;
}

const EMPTY_VALUES = {
  title: "",
  description: "",
  priorityId: undefined as string | undefined,
  employeeId: null as string | number | null,
  dueDate: undefined as Date | undefined,
};

export default function AddTaskDrawer({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);

  useEffect(() => {
    if (!open) return;
    setValues(EMPTY_VALUES);
    fetchTaskPriorities().then((res) => setPriorities(res?.data?.taskPriorities ?? []));
  }, [open]);

  const set = <K extends keyof typeof EMPTY_VALUES>(key: K, value: (typeof EMPTY_VALUES)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!values.title.trim()) {
      toast.error("Please input task title!");
      return;
    }
    if (!values.employeeId) {
      toast.error("Please select employee!");
      return;
    }
    if (!values.dueDate) {
      toast.error("Please input due date!");
      return;
    }
    if (!values.priorityId) {
      toast.error("Please select the priority!");
      return;
    }
    if (!values.description.trim()) {
      toast.error("Please input description!");
      return;
    }

    setSaving(true);
    try {
      const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
      await createTask({
        title: values.title,
        shopId,
        associatedEmployeeId: values.employeeId,
        description: values.description,
        dueDateString: values.dueDate.toISOString().slice(0, 10),
        priorityId: values.priorityId,
        associatedTagIds: [],
      });
      toast.success("Task created successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={saving ? undefined : onClose} side="right" size={480}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
          <div className="text-base font-semibold leading-tight">Add New Task</div>
          <Button variant="outline" size="icon-sm" onClick={onClose} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">
            <Field label="Title" required>
              <Input placeholder="Enter title" value={values.title} onChange={(e) => set("title", e.target.value)} />
            </Field>

            <Field label="Associated Employee" required>
              <ApiSelect
                placeholder="Select Employee"
                value={values.employeeId}
                onChange={(id) => set("employeeId", id)}
                fetchPage={fetchScopedEmployeesPage}
                triggerClassName="w-full"
              />
            </Field>

            <Field label="Due Date" required>
              <DatePicker
                value={values.dueDate}
                onChange={(date) => set("dueDate", date)}
                placeholder="Select due date"
                disabledDate={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </Field>

            <Field label="Select Priority" required>
              <Select
                items={priorities.map((p) => ({ value: p.priorityId, label: p.displayName }))}
                value={values.priorityId}
                onValueChange={(v) => set("priorityId", v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((option) => (
                    <SelectItem key={option.priorityId} value={option.priorityId}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: option.colorCode || "#94a3b8" }} />
                      {option.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Description" required>
              <Textarea
                placeholder="Write description here"
                rows={4}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
