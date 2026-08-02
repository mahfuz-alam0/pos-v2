import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface VaultTransactionDetailsProps {
  transaction: any;
  onClose: () => void;
}

export default function VaultTransactionDetails({ transaction, onClose }: VaultTransactionDetailsProps) {
  const isDeposit = transaction?.event === "DEPOSIT_CASH";

  return (
    <div className="flex h-full flex-col rounded-xl ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <img src={transaction?.userInfo?.avatarUrl} alt="" className="size-8 rounded-full border border-foreground/10" />
          <div className="text-sm font-semibold">{transaction?.userInfo?.name ?? "-"}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isDeposit ? "default" : "destructive"}>{isDeposit ? "Deposit" : "Withdrawal"}</Badge>
          <Button variant="outline" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4 text-sm">
        <Row label="Notes" value={transaction?.notes || "-"} />
        <Row label="Time Zone" value={transaction?.loggedTimeZone ?? "-"} />
        {isDeposit ? (
          <Row label="Cash In" value={`$${transaction?.cashIn ?? "0"}`} />
        ) : (
          <Row label="Cash Out" value={`$${transaction?.cashOut ?? "0"}`} />
        )}
        <Row label="Logged Time" value={transaction?.loggedTime ?? "-"} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-foreground/5 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
