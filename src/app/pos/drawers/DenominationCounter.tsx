"use client";

import { Input } from "@/components/ui/input";

const DOLLAR_DENOMINATIONS = ["$100", "$50", "$20", "$10", "$5", "$2", "$1"];
const CENT_DENOMINATIONS = ["25¢", "10¢", "5¢", "1¢"];
export const ALL_DENOMINATIONS = [...DOLLAR_DENOMINATIONS, ...CENT_DENOMINATIONS];

export function denominationValue(label: string) {
  return label.includes("¢") ? parseFloat(label) / 100 : parseFloat(label.slice(1));
}

export function buildCashDenominationRecord(values: Record<string, number>) {
  return ALL_DENOMINATIONS.filter((label) => (values[label] ?? 0) > 0).map((label) => ({
    denomination: denominationValue(label),
    quantity: values[label],
  }));
}

interface DenominationCounterProps {
  values: Record<string, number>;
  onChange: (values: Record<string, number>, total: number) => void;
  label?: string;
}

export default function DenominationCounter({ values, onChange, label = "Total" }: DenominationCounterProps) {
  const handleChange = (denomLabel: string, raw: string) => {
    const newValue = raw ? parseFloat(raw) : 0;
    const updated = { ...values, [denomLabel]: newValue };
    const total = ALL_DENOMINATIONS.reduce((sum, l) => sum + (updated[l] ?? 0) * denominationValue(l), 0);
    onChange(updated, total);
  };

  const total = ALL_DENOMINATIONS.reduce((sum, l) => sum + (values[l] ?? 0) * denominationValue(l), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Bills</div>
          <div className="grid grid-cols-2 gap-1.5">
            {DOLLAR_DENOMINATIONS.map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-2.5 py-2">
                <span className="w-8 shrink-0 text-sm font-bold">{d}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  className="h-7 border-0 bg-transparent p-0 text-center shadow-none"
                  value={values[d] ?? 0}
                  onChange={(e) => handleChange(d, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Coins</div>
          <div className="grid grid-cols-2 gap-1.5">
            {CENT_DENOMINATIONS.map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-2.5 py-2">
                <span className="w-8 shrink-0 text-sm font-bold">{d}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  className="h-7 border-0 bg-transparent p-0 text-center shadow-none"
                  value={values[d] ?? 0}
                  onChange={(e) => handleChange(d, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-foreground px-4 py-3 text-background">
        <span className="text-sm font-semibold opacity-80">{label}</span>
        <span className="text-lg font-bold">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
