"use client";

import { useEffect, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listBusinessEntities } from "@/services/businessEntities/list";

interface Entity {
  id: string;
  name: string;
}

export function BusinessEntitySelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listBusinessEntities()
      .then((res) => setEntities(res?.data?.data?.businessEntities || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">Business Entity</div>
      <Select
        items={[{ value: "__none__", label: "None" }, ...entities.map((e) => ({ value: e.id, label: e.name }))]}
        value={value ?? "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      >
        <SelectTrigger className="w-60" disabled={loading}>
          <SelectValue placeholder="Select business entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {entities.map((entity) => (
            <SelectItem key={entity.id} value={entity.id}>
              {entity.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
