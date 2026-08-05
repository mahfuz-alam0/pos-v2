import { Card } from "@/components/ui/card";

interface FinancialBreakdownProps {
  grossSales: number;
  discounts: number;
  returns: number;
  cogs: number;
  formatCurrency: (v: number) => string;
}

export default function FinancialBreakdown({ grossSales, discounts, returns, cogs, formatCurrency }: FinancialBreakdownProps) {
  const items = [
    { label: "Gross Sales", value: grossSales, tint: "bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900", text: "text-sky-600" },
    { label: "Discounts", value: discounts, tint: "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900", text: "text-blue-700" },
    { label: "Returns", value: returns, tint: "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900", text: "text-indigo-600" },
    { label: "COGS", value: cogs, tint: "bg-slate-50 border-slate-100 dark:bg-slate-900/30 dark:border-slate-800", text: "text-slate-500" },
  ];

  return (
    <Card className="flex h-full flex-col p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-sm bg-blue-500" />
        <h3 className="text-base font-semibold">Financial Breakdown</h3>
      </div>
      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-4 p-5">
        {items.map((item) => (
          <div key={item.label} className={`flex flex-col justify-center rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${item.tint}`}>
            <span className={`mb-2 block text-xs font-semibold uppercase tracking-wide ${item.text}`}>{item.label}</span>
            <div className="text-xl font-bold">{formatCurrency(item.value)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
