import io from "socket.io-client";

export function connectToSocket({ url, shopId }: { url?: string; shopId?: string } = {}) {
  if (!url) {
    console.error("URL is required for socket connection");
    return null;
  }

  let finalShopId = shopId;
  if (!finalShopId) {
    try {
      finalShopId = JSON.parse(localStorage.getItem("shopId"));
    } catch {
      finalShopId = null;
    }
  }

  if (!finalShopId) {
    console.error("shopId is required for socket connection");
    return null;
  }

  const socket = io(url, {
    query: { shopId: finalShopId },
    transports: ["websocket"],
    withCredentials: true,
  });

  socket.on("error", (error) => {
    console.error("Socket error on", (socket.io as any).uri, error);
  });

  return socket;
}
