"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight } from "lucide-react";

import { fetchAssociatedUoms } from "@/services/uom/listAssociated";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function showCappedDecimalNumbers(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export default function StorageLocations({
  editMode,
  storageLocationData,
  sellableUoMId,
  allUomOptions = [],
  onChange,
  registerValidator,
}) {
  const [rows, setRows] = useState([]);
  const [associatedUoms, setAssociatedUoms] = useState([]);
  const [uomLoading, setUomLoading] = useState(false);

  const uomOptions = associatedUoms.length
    ? Array.from(new Map([...associatedUoms, ...allUomOptions].map((u) => [u.id, u])).values())
    : allUomOptions;
  const [selectedUoMIds, setSelectedUoMIds] = useState({});
  const [errors, setErrors] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const rowsRef = useRef([]);

  useEffect(() => {
    if (!storageLocationData) return;
    const newRows = storageLocationData.map((loc) => ({
      id: loc.id,
      name: loc.name,
      displayUoMId: loc.displayUoMId,
      packagesBreakdown: loc.packagesBreakdown ?? [],
      totalQuantity: (loc.packagesBreakdown ?? []).reduce(
        (sum, pkg) => sum + pkg.totalQuantity,
        0
      ),
    }));
    setRows(newRows);
    rowsRef.current = newRows;
    const initialSelection = {};
    newRows.forEach((r) => {
      initialSelection[r.id] = r.displayUoMId;
    });
    setSelectedUoMIds(initialSelection);
  }, [storageLocationData]);

  useEffect(() => {
    if (!sellableUoMId) return;
    setUomLoading(true);
    fetchAssociatedUoms(sellableUoMId)
      .then((res) => {
        setAssociatedUoms(res?.data?.data?.uoms ?? []);
      })
      .catch(() => {
        toast.error("Failed to load unit of measurement options");
      })
      .finally(() => setUomLoading(false));
  }, [sellableUoMId]);

  const validateAll = () => {
    const newErrors = {};
    let valid = true;
    rowsRef.current.forEach((row) => {
      if (!selectedUoMIds[row.id]) {
        newErrors[row.id] = "Please select a Unit of Measurement";
        valid = false;
      }
    });
    setErrors(newErrors);
    return valid;
  };

  useEffect(() => {
    if (registerValidator) registerValidator(() => validateAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUoMIds]);

  const handleUomChange = (rowId, value) => {
    const next = { ...selectedUoMIds, [rowId]: value };
    setSelectedUoMIds(next);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[rowId];
      return copy;
    });
    if (onChange) {
      const payload = rowsRef.current.map((r) => ({
        id: r.id,
        displayUoMId: next[r.id],
      }));
      onChange(payload);
    }
  };

  const renderQuantityWithUom = (quantity, uomId) => {
    const uom = uomOptions.find((u) => u.id === uomId);
    if (!uom) return `${quantity}`;
    return `${showCappedDecimalNumbers(quantity / uom.conversionRate)} ${uom.shortForm}`;
  };

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No storage locations found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60">
            <TableHead className="w-8" />
            <TableHead className="text-muted-foreground">Storage Location</TableHead>
            <TableHead className="text-muted-foreground">Total Quantity</TableHead>
            <TableHead className="text-muted-foreground">Unit of Measurement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const uom = uomOptions.find((u) => u.id === (selectedUoMIds[row.id] ?? row.displayUoMId));
            const isExpanded = expandedId === row.id;
            return (
              <>
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] hover:bg-muted/40"
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                >
                  <TableCell>
                    <span className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.totalQuantity}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {editMode ? (
                      <div className="flex flex-col gap-1">
                        <Select
                          items={uomOptions.map((u) => ({ value: u.id, label: `${u.name} (${u.shortForm})` }))}
                          value={selectedUoMIds[row.id] ?? ""}
                          onValueChange={(value) => handleUomChange(row.id, value)}
                          disabled={uomLoading}
                        >
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue placeholder="Select UoM" />
                          </SelectTrigger>
                          <SelectContent>
                            {uomOptions.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.shortForm})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors[row.id] && (
                          <span className="text-xs text-destructive">{errors[row.id]}</span>
                        )}
                      </div>
                    ) : row.displayUoMId ? (
                      <span>
                        {uom?.name} ({uom?.shortForm})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${row.id}-detail`}>
                    <TableCell colSpan={4} className="bg-muted/30 p-4">
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                        <p className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-500">Package Details:</p>
                        <Table>
                          <TableHeader className="[&_tr]:border-b-0">
                            <TableRow className="border-gray-200">
                              <TableHead className="text-gray-500">Platform Package ID</TableHead>
                              <TableHead className="text-gray-500">Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {row.packagesBreakdown.map((pkg) => (
                              <TableRow key={pkg.id} className="border-gray-200 text-gray-500 last:border-b-0">
                                <TableCell>{pkg.advertisedId ?? pkg.id}</TableCell>
                                <TableCell>
                                  {renderQuantityWithUom(pkg.totalQuantity, selectedUoMIds[row.id] ?? row.displayUoMId)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
