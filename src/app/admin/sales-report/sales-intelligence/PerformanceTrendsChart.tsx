import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

interface TrendPoint {
  date: string;
  aov: number;
  margin: number;
  percentOfOrders: number;
}

export default function PerformanceTrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card className="p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-sm bg-indigo-500" />
        <h3 className="text-base font-semibold">Performance Trends</h3>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}
              cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, paddingTop: 20 }} iconType="circle" />
            <Line type="monotone" dataKey="aov" stroke="#0ea5e9" strokeWidth={3} name="AOV" dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="margin" stroke="#3b82f6" strokeWidth={3} name="Gross Margin %" dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="percentOfOrders" stroke="#6366f1" strokeWidth={3} name="% Orders w/ Discount" dot={false} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
