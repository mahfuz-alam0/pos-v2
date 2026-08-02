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
      icon: <DollarSign className="size-6" />,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Gross Margin",
      value: formatPercentage(grossMargin),
      icon: <Percent className="size-6" />,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Net Sales",
      value: formatCurrency(netSales),
      icon: <ShoppingCart className="size-6" />,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      title: "Cost of Goods",
      value: formatCurrency(Math.abs(cogs || 0)),
      icon: <DollarSign className="size-6" />,
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="p-6 shadow-sm ring-0">
          <div className={`mb-4 inline-flex rounded-xl p-3 ${card.bg} ${card.color}`}>{card.icon}</div>
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">{card.title}</h3>
          <div className="text-2xl font-bold tracking-tight lg:text-3xl">{card.value}</div>
        </Card>
      ))}
    </div>
  );
}
