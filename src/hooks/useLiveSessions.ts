import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { fetchLiveSessions } from "@/services/liveInventory/listLiveSessions";
import { connectToSocket } from "@/lib/socket";

export function useLiveSessions(shopId: string | null) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const socketRef = useRef<ReturnType<typeof connectToSocket>>(null);

  useEffect(() => {
    if (!shopId) return;

    const load = async () => {
      try {
        setLoading(true);
        const sessions = await fetchLiveSessions(shopId);
        setData(sessions);
      } catch (err) {
        setError(err);
        toast.error("Failed to fetch live sessions");
      } finally {
        setLoading(false);
      }
    };

    load();

    socketRef.current = connectToSocket({ url: `${process.env.NEXT_PUBLIC_BASE_URL}/live-count-session`, shopId });
    socketRef.current?.on("liveCountSessionCreated", () => load());
    socketRef.current?.on("liveCountSessionTerminated", () => load());

    return () => {
      socketRef.current?.disconnect();
    };
  }, [shopId]);

  return { data, loading, error };
}
