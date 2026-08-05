import { DollarSign, Percent, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardsProps {
  grossProfit: number;
  grossMargin: number;
  netSales: number;
  cogs: number;
  formatCurrency: (v: number) => string;
  formatPercentage: (v: number) => string;
}

export default function MetricCards({
  grossProfit,
  grossMargin,
  netSales,
  cogs,
  formatCurrency,
  formatPercentage,
}: MetricCardsProps) {
  const cards = [
    {
      title: "Gross Profit",
      value: formatCurrency(grossProfit),
      icon: <DollarSign className="size-5" />,
      tint: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900",
      text: "text-emerald-600",
    },
    {
      title: "Gross Margin",
      value: formatPercentage(grossMargin),
      icon: <Percent className="size-5" />,
      tint: "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900",
      text: "text-blue-600",
    },
    {
      title: "Net Sales",
      value: formatCurrency(netSales),
      icon: <ShoppingCart className="size-5" />,
      tint: "bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900",
      text: "text-indigo-600",
    },
    {
      title: "Cost of Goods",
      value: formatCurrency(Math.abs(cogs || 0)),
      icon: <DollarSign className="size-5" />,
      tint: "bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900",
      text: "text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`flex flex-col justify-center rounded-xl border p-5 shadow-sm ring-0 transition-all hover:-translate-y-0.5 hover:shadow-md ${card.tint}`}
        >
          <div className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${card.text}`}>
            {card.icon}
            {card.title}
          </div>
          <div className="text-2xl font-bold tracking-tight lg:text-3xl">{card.value}</div>
        </Card>
      ))}
    </div>
  );
}
