"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { fetchShopsData } from "@/services/shops/list";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface Shop {
  id: string | number;
  name: string;
}

export default function ShopMultiSelect({
  value,
  onChange,
}: {
  value: (string | number)[];
  onChange: (ids: (string | number)[]) => void;
}) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchShopsData().then((res) => setShops(res?.data ?? []));
  }, []);

  const toggle = (id: string | number) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const selectedNames = shops.filter((s) => value.includes(s.id)).map((s) => s.name);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm outline-none dark:bg-input/30"
        )}
      >
        <span className={cn("truncate text-left", selectedNames.length === 0 && "text-muted-foreground")}>
          {selectedNames.length > 0 ? selectedNames.join(", ") : "Select Shops"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="start">
        <div className="max-h-56 overflow-y-auto">
          {shops.length === 0 && <div className="py-3 text-center text-sm text-muted-foreground">No shops</div>}
          {shops.map((shop) => (
            <label
              key={shop.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox checked={value.includes(shop.id)} onCheckedChange={() => toggle(shop.id)} />
              <span className="truncate">{shop.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
