"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export interface LegacyPermissionNode {
  id: string;
  title: string;
  permissionCode: string;
  actions?: { name: string; effect: string }[];
}

export interface LegacyPermissionEntry {
  permissionCode: string;
  effect: string;
}

interface LegacyPermissionTreeProps {
  nodes: LegacyPermissionNode[];
  checkedCodes: string[];
  onChange: (codes: string[], entries: LegacyPermissionEntry[]) => void;
}

function buildEntries(nodes: LegacyPermissionNode[], codes: string[]): LegacyPermissionEntry[] {
  return codes.flatMap((code) => {
    const node = nodes.find((n) => n.permissionCode === code);
    return (node?.actions ?? []).map((action) => ({ permissionCode: code, effect: action.effect }));
  });
}

export default function LegacyPermissionTree({ nodes, checkedCodes, onChange }: LegacyPermissionTreeProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => nodes.filter((n) => n.permissionCode.toLowerCase().includes(search.toLowerCase())),
    [nodes, search]
  );

  const toggle = (code: string) => {
    const updated = checkedCodes.includes(code) ? checkedCodes.filter((c) => c !== code) : [...checkedCodes, code];
    onChange(updated, buildEntries(nodes, updated));
  };

  const toggleAll = (checked: boolean) => {
    const updated = checked ? nodes.map((n) => n.permissionCode) : [];
    onChange(updated, buildEntries(nodes, updated));
  };

  const allCodes = nodes.map((n) => n.permissionCode);
  const allChecked = allCodes.length > 0 && allCodes.every((c) => checkedCodes.includes(c));

  return (
    <div className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10 p-4">
      <Input placeholder="Search by permission code" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />

      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={allChecked} onCheckedChange={(c) => toggleAll(!!c)} />
        Select All
      </label>

      <div className="flex flex-col gap-1">
        {filtered.map((node) => (
          <label key={node.permissionCode} className="flex items-center gap-2 py-1 text-sm">
            <Checkbox checked={checkedCodes.includes(node.permissionCode)} onCheckedChange={() => toggle(node.permissionCode)} />
            <span>
              {node.title} <span className="text-xs text-muted-foreground">({node.permissionCode})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
