import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfitAndLossRow {
  key: number;
  name: string;
  totalRevenue: string;
}

export default function ProfitAndLossTable({ data, loading }: { data: ProfitAndLossRow[]; loading: boolean }) {
  return (
    <Card className="flex h-full flex-col p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-sm bg-sky-500" />
        <h3 className="text-base font-semibold">Profit and Loss Summary</h3>
      </div>
      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow className="bg-muted/60">
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Total Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 6 }).map((_, r) => (
              <TableRow key={r} className="border-b-0">
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              </TableRow>
            ))}
          {!loading &&
            data.map((row, i) => (
              <TableRow
                key={row.key}
                className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-stone-100 dark:bg-stone-800" : ""}`}
              >
                <TableCell>{row.name}</TableCell>
                <TableCell className="text-right font-medium">{row.totalRevenue}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>
  );
}
