"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "./session-context";
import SessionProductsTable from "./SessionProductsTable";

const CATEGORIES = ["Electronics", "Books", "Clothing"];
const BRANDS: Record<string, string[]> = {
  Electronics: ["Samsung", "Apple", "Sony"],
  Books: ["Penguin", "HarperCollins", "Random House"],
  Clothing: ["Nike", "Adidas", "Puma"],
};
const TAGS = ["New Arrival", "Best Seller", "Discounted"];

interface Criterion {
  type: "category" | "brands" | "tags";
  value: string;
}

export default function SessionCriteriaStep() {
  const { sessionData, setSessionData } = useSession();
  const [applyCriteria, setApplyCriteria] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<Criterion[]>([]);
  const [currentOptions, setCurrentOptions] = useState<Criterion["type"][]>(["category", "brands", "tags"]);
  const [selectedOption, setSelectedOption] = useState<Criterion["type"] | undefined>();

  const handleApplyCriteriaChange = (checked: boolean) => {
    setApplyCriteria(checked);
    setFilterCriteria([]);
    setCurrentOptions(["category", "brands", "tags"]);
    setSelectedOption(undefined);
    setSessionData({ ...sessionData, criteria: [] });
  };

  const addCriteria = () => {
    if (!selectedOption) return;
    const next = [...filterCriteria, { type: selectedOption, value: "" }];
    setFilterCriteria(next);
    setSessionData({ ...sessionData, criteria: next });
    setCurrentOptions(currentOptions.filter((o) => o !== selectedOption));
    setSelectedOption(undefined);
  };

  const removeCriteria = (index: number) => {
    const removed = filterCriteria[index];
    const next = filterCriteria.filter((_, i) => i !== index);
    setFilterCriteria(next);
    setCurrentOptions([...currentOptions, removed.type]);
    setSessionData({ ...sessionData, criteria: next });
  };

  const handleValueChange = (value: string, index: number) => {
    const next = filterCriteria.map((c, i) => (i === index ? { ...c, value } : c));
    setFilterCriteria(next);
    setSessionData({ ...sessionData, criteria: next });
  };

  const optionsFor = (criterion: Criterion) => {
    if (criterion.type === "category") return CATEGORIES;
    if (criterion.type === "brands") {
      const selectedCategories = filterCriteria.filter((c) => c.type === "category").map((c) => c.value);
      return selectedCategories.flatMap((cat) => BRANDS[cat] ?? []);
    }
    return TAGS;
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={applyCriteria} onCheckedChange={(c) => handleApplyCriteriaChange(!!c)} />
        Apply Criteria
      </label>

      {applyCriteria && (
        <>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Filteration Criteria</h3>
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <label className="text-sm">Select Attribute</label>
                <Select value={selectedOption} onValueChange={(v) => setSelectedOption(v as Criterion["type"])}>
                  <SelectTrigger className="w-90">
                    <SelectValue placeholder="Select an attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedOption !== undefined && (
                <Button variant="outline" onClick={addCriteria}>
                  Add
                </Button>
              )}
            </div>

            {filterCriteria.map((criterion, index) => (
              <div key={index} className="mt-2 flex items-center gap-2">
                <span className="w-20 text-sm">{criterion.type.charAt(0).toUpperCase() + criterion.type.slice(1)}</span>
                <span className="w-24 text-center text-sm text-muted-foreground">is any of</span>
                <Select value={criterion.value} onValueChange={(v) => handleValueChange(v, index)}>
                  <SelectTrigger className="w-90">
                    <SelectValue placeholder={`Select ${criterion.type}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsFor(criterion).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {index === filterCriteria.length - 1 && (
                  <Trash2 className="size-4 cursor-pointer text-muted-foreground" onClick={() => removeCriteria(index)} />
                )}
              </div>
            ))}

            <div className="mt-4 border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold">Sort Criteria</h3>
              <label className="text-sm">Select Sort Criteria</label>
              <Select onValueChange={(v) => setSessionData({ ...sessionData, sortCriteria: v } as any)}>
                <SelectTrigger className="w-90">
                  <SelectValue placeholder="Select Sort Criteria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a-z">Product sort from A to Z</SelectItem>
                  <SelectItem value="z-a">Product sort from Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Targeted Products</h3>
            <SessionProductsTable />
          </div>
        </>
      )}
    </div>
  );
}
