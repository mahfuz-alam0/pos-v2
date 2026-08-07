import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductsAtLossRow {
  key: number;
  productName: string;
  brandName: string;
  category: string;
  itemsSold: number;
  grossSales: string;
  netSales: string;
  totalCost: string;
  effectiveDiscount: number;
  grossMargin: number;
}

export default function ProductsSoldAtLossTable({
  data,
  loading,
  formatPercentage,
}: {
  data: ProductsAtLossRow[];
  loading: boolean;
  formatPercentage: (v: number) => string;
}) {
  return (
    <Card className="p-0 shadow-sm ring-0">
      <div className="flex items-center gap-3 px-6 py-4 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="h-5 w-1 rounded-sm bg-slate-500" />
        <h3 className="text-base font-semibold">Products Sold at a Loss</h3>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="bg-muted/60">
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Items Sold</TableHead>
              <TableHead className="text-right">Gross Sales</TableHead>
              <TableHead className="text-right">Net Sales</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-right">Effective Discount %</TableHead>
              <TableHead className="text-right">Gross Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, r) => (
                <TableRow key={r} className="border-b-0">
                  {Array.from({ length: 9 }).map((__, c) => (
                    <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && data.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                  No products sold at a loss for this period.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data.map((row, i) => (
                <TableRow
                  key={row.key}
                  className={`border-b-0 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] ${i % 2 === 1 ? "bg-table-zebra" : ""}`}
                >
                  <TableCell>{row.productName}</TableCell>
                  <TableCell>{row.brandName}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">{row.itemsSold}</TableCell>
                  <TableCell className="text-right">{row.grossSales}</TableCell>
                  <TableCell className="text-right">{row.netSales}</TableCell>
                  <TableCell className="text-right">{row.totalCost}</TableCell>
                  <TableCell className="text-right">{formatPercentage(row.effectiveDiscount || 0)}</TableCell>
                  <TableCell className="text-right text-red-500">{formatPercentage(row.grossMargin || 0)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
