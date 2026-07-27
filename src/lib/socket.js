import io from "socket.io-client";

// Old code also registered per-namespace listeners here that only console.log'd
// (never touched state) — dropped as leftover debug cruft; callers (e.g. useQueue)
// register the listeners that actually matter on the returned socket.
export function connectToSocket({ url, shopId } = {}) {
  if (!url) return null;

  let finalShopId = shopId;
  if (!finalShopId) {
    try {
      const storedShopId = localStorage.getItem("shopId");
      if (storedShopId) finalShopId = JSON.parse(storedShopId);
    } catch {
      finalShopId = null;
    }
  }
  if (!finalShopId) return null;

  const socket = io(url, {
    query: { shopId: finalShopId },
    transports: ["websocket"],
    withCredentials: true,
  });

  socket.on("error", (error) => {
    console.error("Socket error on", socket.io.uri, error);
  });

  return socket;
}

export default connectToSocket;
