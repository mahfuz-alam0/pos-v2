"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { toast } from "sonner";

import { useShop } from "@/context/shop-context";
import { fetchLiveSessions } from "@/services/liveInventory/listLiveSessions";

interface LiveSessionTimerProps {
  sessionId: string | null;
}

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "Session expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m ` : ""}${secs}s`.trim();
}

export default function LiveSessionTimer({ sessionId }: LiveSessionTimerProps) {
  const { shopId } = useShop();
  const [sessions, setSessions] = useState<any[]>([]);
  const [remainingTime, setRemainingTime] = useState("");
  const [sessionFound, setSessionFound] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    fetchLiveSessions(shopId)
      .then((res) => setSessions(res?.data?.sessions ?? []))
      .catch(() => toast.error("Failed to fetch live sessions"));
  }, [shopId]);

  useEffect(() => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      setSessionFound(false);
      return;
    }
    setSessionFound(true);
    const willExpireAt = new Date(session.willExpireAt);

    const update = () => {
      const remaining = differenceInSeconds(willExpireAt, new Date());
      setRemainingTime(formatRemaining(remaining));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sessions, sessionId]);

  return (
    <p className="text-base text-foreground">
      {sessionFound ? (
        <>Session is going on: <span>{remainingTime}</span></>
      ) : (
        "No live sessions available"
      )}
    </p>
  );
}
