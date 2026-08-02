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
      <label className="flex items-center gap-2 py-1 text-sm">
        <Checkbox checked={isRead} onCheckedChange={(c) => onChange(setEntry(permissions, node.code, !!c, false))} />
        <span>{node.displayName}</span>
        <span className="text-xs text-muted-foreground">(View Only)</span>
      </label>
    );
  }

  if (!isReadConcernInvolved && isWriteConcernInvolved) {
    return (
      <label className="flex items-center gap-2 py-1 text-sm">
        <Checkbox checked={isWrite} onCheckedChange={(c) => onChange(setEntry(permissions, node.code, false, !!c))} />
        <span>{node.displayName}</span>
      </label>
    );
  }

  return (
    <div className="flex items-center gap-4 py-1 text-sm">
      <span className="min-w-0 flex-1 truncate">{node.displayName}</span>
      <label className="flex items-center gap-1.5">
        <Checkbox
          checked={isRead && !isWrite}
          onCheckedChange={(c) => onChange(setEntry(permissions, node.code, !!c, false))}
        />
        <span className="text-xs text-muted-foreground">View Only</span>
      </label>
      <label className="flex items-center gap-1.5">
        <Checkbox
          checked={isWrite}
          onCheckedChange={(c) => onChange(setEntry(permissions, node.code, false, !!c))}
        />
        <span className="text-xs text-muted-foreground">Manage</span>
      </label>
    </div>
  );
}

function TreeNode({ node, permissions, onChange, depth }: { node: PermissionBoundaryNode; permissions: PermissionEntry[]; onChange: (p: PermissionEntry[]) => void; depth: number }) {
  if (node.childRefs && node.childRefs.length > 0) {
    return (
      <div style={{ marginLeft: depth * 16 }} className="flex flex-col gap-1 py-1">
        <div className="text-sm font-semibold text-foreground">{node.displayName}</div>
        <div className="flex flex-col border-l border-foreground/10 pl-3">
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
    <div className="flex flex-col gap-2 rounded-xl ring-1 ring-foreground/10 p-4">
      {nodes.map((node) => (
        <TreeNode key={node.code} node={node} permissions={permissions} onChange={onChange} depth={0} />
      ))}
    </div>
  );
}
