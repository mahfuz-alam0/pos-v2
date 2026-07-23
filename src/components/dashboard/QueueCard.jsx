"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

function calculateWaitTime(updatedAt) {
  if (!updatedAt) return "N/A";
  const diffInMs = new Date() - new Date(updatedAt);
  return Math.floor(diffInMs / (1000 * 60));
}

function calculateAge(dob) {
  if (!dob || isNaN(Date.parse(dob))) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age > 0 ? age : null;
}

export default function QueueCard({ data, onRemove }) {
  const [waitTime, setWaitTime] = useState(calculateWaitTime(data?.updatedAt));

  useEffect(() => {
    const timer = setInterval(() => setWaitTime(calculateWaitTime(data?.updatedAt)), 60000);
    return () => clearInterval(timer);
  }, [data?.updatedAt]);

  const age = calculateAge(data?.dob);
  const isServing = Boolean(data?.isGettingServed);
  const statusBg = isServing ? "#059669" : "#d97706";

  return (
    <div className="relative flex w-[calc((100%-16px)/3)] min-w-[220px] flex-col overflow-hidden rounded-xl border-2 border-border bg-component-bg shadow-sm">
      <button
        onClick={() => onRemove?.(data)}
        className="absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full border-0 bg-surface-alt text-[10px] text-muted-foreground hover:bg-red-500 hover:text-white"
      >
        <X className="size-3" />
      </button>

      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="relative flex-shrink-0">
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {(data?.firstName || "?")[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate pr-5 text-[13px] font-semibold text-text">
            {data?.firstName} {data?.lastName || ""}
          </div>
          {age && <span className="text-[10px] text-muted-foreground">{age} y/o</span>}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2 text-[10px] text-muted-foreground">
        <span>
          <span className="font-semibold text-text">{waitTime}</span> min in queue
        </span>
        {data?.customerTypeName && <span className="max-w-[90px] truncate text-right">{data.customerTypeName}</span>}
      </div>

      <div
        className="mt-auto flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold tracking-wide text-white select-none"
        style={{ background: statusBg }}
      >
        {isServing ? "Return to Queue" : "Available"}
      </div>
    </div>
  );
}
