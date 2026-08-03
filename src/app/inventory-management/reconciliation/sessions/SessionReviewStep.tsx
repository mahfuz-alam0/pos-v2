"use client";

import { Card } from "@/components/ui/card";
import { useSession } from "./session-context";

export default function SessionReviewStep() {
  const { sessionData } = useSession();

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold">Session Review</h3>
      <div className="flex flex-col gap-2 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Location: </span>
          {sessionData.location}
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Budtenders: </span>
          {sessionData.budtenders.join(", ")}
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Duration: </span>
          {sessionData.duration}
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Blind Count: </span>
          {sessionData.blindCount ? "Yes" : "No"}
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Criteria: </span>
          <div className="flex flex-col">
            {sessionData.criteria.map((crit: any, idx: number) => (
              <span key={idx}>
                {crit.type.charAt(0).toUpperCase() + crit.type.slice(1)}: {crit.value}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Selected Products: </span>
          {sessionData.selectedProducts.length > 0 ? sessionData.selectedProducts.join(", ") : "No products selected"}
        </div>
      </div>
    </Card>
  );
}
