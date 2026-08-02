"use client";

interface TaxDetail {
  taxName: string;
  taxRate: number;
  timesApplied?: number;
  taxesRevenue?: number;
  totalAmount: number;
}

interface ClassificationGroup {
  classificationName: string;
  isMJ?: boolean;
  taxes: TaxDetail[];
}

function fmt(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function ClassificationTaxTable({ title, items }: { title: string; items: TaxDetail[] }) {
  if (!items || items.length === 0) return null;
  const total = items.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between rounded-t-lg bg-muted/60 px-3 py-2 text-sm font-semibold">
        <span>{title}</span>
        <span>{fmt(total)}</span>
      </div>
      <div className="overflow-hidden rounded-b-lg ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-2 text-left font-medium">Tax Name</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">Times Applied</th>
              <th className="px-3 py-2 text-right font-medium">Taxable Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t, i) => (
              <tr key={i} className="shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                <td className="px-3 py-2">{t.taxName}</td>
                <td className="px-3 py-2 text-right">{Number(t.taxRate || 0).toFixed(2)}%</td>
                <td className="px-3 py-2 text-right">{t.timesApplied || 0}</td>
                <td className="px-3 py-2 text-right">{fmt(t.taxesRevenue || 0)}</td>
                <td className="px-3 py-2 text-right font-semibold">{fmt(t.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TaxBreakdownCard({
  taxesByClassification,
}: {
  taxData?: any[];
  taxesByClassification: ClassificationGroup[];
}) {
  if (!taxesByClassification || taxesByClassification.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No tax data available for the selected date range</p>;
  }

  const mjGroups = taxesByClassification.filter((c) => c.isMJ === true);
  const nonMjGroups = taxesByClassification.filter((c) => c.isMJ !== true);
  const grandTotal = taxesByClassification.reduce(
    (sum, c) => sum + (c.taxes || []).reduce((s, t) => s + (Number(t.totalAmount) || 0), 0),
    0,
  );
  const mjTotal = mjGroups.reduce((sum, c) => sum + (c.taxes || []).reduce((s, t) => s + (Number(t.totalAmount) || 0), 0), 0);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold ring-1 ring-foreground/10">
        <span>Total Tax</span>
        <span>{fmt(grandTotal)}</span>
      </div>

      {mjGroups.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between border-b-2 border-green-500 pb-1.5 text-sm font-bold">
            <span>Marijuana</span>
            {mjTotal > 0 && <span className="text-green-600 dark:text-green-400">{fmt(mjTotal)}</span>}
          </div>
          {mjGroups.map((c) => (
            <ClassificationTaxTable key={c.classificationName} title={c.classificationName} items={c.taxes || []} />
          ))}
        </div>
      )}

      {nonMjGroups.map((c) => (
        <ClassificationTaxTable key={c.classificationName} title={c.classificationName} items={c.taxes || []} />
      ))}
    </div>
  );
}
