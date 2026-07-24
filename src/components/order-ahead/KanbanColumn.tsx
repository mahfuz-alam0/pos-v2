"use client";

import { useState, useEffect } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Skeleton } from "@/components/ui/skeleton";
import OrderCard from "./OrderCard";

// Within-column drag reorder only — cosmetic, doesn't persist (matches the
// old app's react-sortable-hoc behavior, which never called an API on drop).
export default function KanbanColumn({ label, accent, count, items, type, loading, ...cardHandlers }: any) {
  const [order, setOrder] = useState(items.map((i) => i.id));

  useEffect(() => {
    setOrder(items.map((i) => i.id));
  }, [items]);

  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const orderedItems = order.map((id) => byId[id]).filter(Boolean);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-card"
      style={{ borderTop: `4px solid ${accent}` }}
    >
      <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold">
        {label}
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {loading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}

        {!loading && orderedItems.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No orders</div>
        )}

        {!loading && orderedItems.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {orderedItems.map((item) => (
                <OrderCard key={item.id} type={type} item={item} sortId={item.id} {...cardHandlers} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
