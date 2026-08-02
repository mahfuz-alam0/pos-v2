"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "./session-context";

const dummyProducts = [
  { id: 1, name: "Product 1", isAlreadyInOtherSession: true },
  { id: 2, name: "Product 2", isAlreadyInOtherSession: false },
  { id: 3, name: "Product 3", isAlreadyInOtherSession: false },
  { id: 4, name: "Product 4", isAlreadyInOtherSession: true },
  { id: 5, name: "Product 5", isAlreadyInOtherSession: false },
];

export default function SessionProductsTable() {
  const { sessionData, setSessionData } = useSession();
  const [excludeChecked, setExcludeChecked] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectableIds = dummyProducts.filter((p) => !p.isAlreadyInOtherSession).map((p) => p.id);

  const handleSelectAll = (checked: boolean) => {
    const next = checked ? selectableIds : [];
    setSelectedIds(next);
    setSessionData({ ...sessionData, selectedProducts: next });
  };

  const toggleOne = (id: number, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id);
    setSelectedIds(next);
    setSessionData({ ...sessionData, selectedProducts: next });
  };

  const filtered = excludeChecked ? dummyProducts.filter((p) => !p.isAlreadyInOtherSession) : dummyProducts;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={excludeChecked} onCheckedChange={(c) => setExcludeChecked(!!c)} />
          Exclude Products For Counting
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selectedIds.length === selectableIds.length}
            onCheckedChange={(c) => handleSelectAll(!!c)}
          />
          Select All
        </label>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Product Name</TableHead>
            <TableHead>Already in Other Session</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(product.id)}
                  disabled={product.isAlreadyInOtherSession}
                  onCheckedChange={(c) => toggleOne(product.id, !!c)}
                />
              </TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.isAlreadyInOtherSession ? "Yes" : "No"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
