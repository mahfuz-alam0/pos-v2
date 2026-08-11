"use client";

import { Checkbox } from "@/components/ui/checkbox";

export interface PermissionBoundaryNode {
  code: string;
  displayName: string;
  description?: string;
  isReadConcernInvolved: boolean;
  isWriteConcernInvolved: boolean;
  childRefs?: PermissionBoundaryNode[];
}

export interface PermissionEntry {
  code: string;
  isReadEnabled: boolean;
  isWriteEnabled: boolean;
}

interface PermissionBoundaryTreeProps {
  nodes: PermissionBoundaryNode[];
  permissions: PermissionEntry[];
  onChange: (permissions: PermissionEntry[]) => void;
}

function findEntry(permissions: PermissionEntry[], code: string) {
  return permissions.find((p) => p.code === code);
}

function setEntry(permissions: PermissionEntry[], code: string, isReadEnabled: boolean, isWriteEnabled: boolean) {
  const rest = permissions.filter((p) => p.code !== code);
  if (!isReadEnabled && !isWriteEnabled) return rest;
  return [...rest, { code, isReadEnabled, isWriteEnabled }];
}

function Leaf({ node, permissions, onChange }: { node: PermissionBoundaryNode; permissions: PermissionEntry[]; onChange: (p: PermissionEntry[]) => void }) {
  const entry = findEntry(permissions, node.code);
  const isRead = entry?.isReadEnabled ?? false;
  const isWrite = entry?.isWriteEnabled ?? false;
  const { isReadConcernInvolved, isWriteConcernInvolved } = node;

  if (isReadConcernInvolved && !isWriteConcernInvolved) {
    return (
      <div className="py-2">
        <label className="flex items-center gap-2 text-base text-foreground/70">
          <Checkbox checked={isRead} onCheckedChange={(c) => onChange(setEntry(permissions, node.code, !!c, false))} />
          <span className="text-foreground">{node.displayName}</span>
          <span className="text-xs text-foreground/70">(View Only)</span>
        </label>
        {node.description && <p className="mt-1 text-xs text-foreground/70">{node.description}</p>}
      </div>
    );
  }

  if (!isReadConcernInvolved && isWriteConcernInvolved) {
    return (
      <div className="py-2">
        <label className="flex items-center gap-2 text-base text-foreground/70">
          <Checkbox checked={isWrite} onCheckedChange={(c) => onChange(setEntry(permissions, node.code, false, !!c))} />
          <span className="text-foreground">{node.displayName}</span>
        </label>
        {node.description && <p className="mt-1 text-xs text-foreground/70">{node.description}</p>}
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-4 text-base text-foreground/70">
        <span className="min-w-0 flex-1 truncate text-foreground">{node.displayName}</span>
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isRead && !isWrite}
            onCheckedChange={(c) => onChange(setEntry(permissions, node.code, !!c, false))}
          />
          <span className="text-xs text-foreground/70">View Only</span>
        </label>
        <label className="flex items-center gap-1.5">
          <Checkbox
            checked={isWrite}
            onCheckedChange={(c) => onChange(setEntry(permissions, node.code, false, !!c))}
          />
          <span className="text-xs text-foreground/70">Manage</span>
        </label>
      </div>
      {node.description && <p className="mt-1 text-xs text-foreground/70">{node.description}</p>}
    </div>
  );
}

function TreeNode({ node, permissions, onChange, depth }: { node: PermissionBoundaryNode; permissions: PermissionEntry[]; onChange: (p: PermissionEntry[]) => void; depth: number }) {
  if (node.childRefs && node.childRefs.length > 0) {
    return (
      <div style={{ marginLeft: depth * 16 }} className="flex flex-col gap-2 py-2">
        <div>
          <div className="text-base font-semibold text-foreground">{node.displayName}</div>
          {node.description && <p className="text-xs text-foreground/70">{node.description}</p>}
        </div>
        <div className="flex flex-col gap-1 border-l border-foreground/10 pl-3">
          {node.childRefs.map((child) => (
            <TreeNode key={child.code} node={child} permissions={permissions} onChange={onChange} depth={0} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <Leaf node={node} permissions={permissions} onChange={onChange} />
    </div>
  );
}

export default function PermissionBoundaryTree({ nodes, permissions, onChange }: PermissionBoundaryTreeProps) {
  return (
    <div className="flex flex-col gap-4">
      {nodes.map((node) => (
        <div key={node.code} className="rounded-xl border border-border p-5">
          <TreeNode node={node} permissions={permissions} onChange={onChange} depth={0} />
        </div>
      ))}
    </div>
  );
}
