import io from "socket.io-client";

// These namespaces authorize purely on the "shopId" query param (verified against
// the API directly), so — same as the chat socket in src/services/chat/inbox.ts —
// there's no need to route through the same-origin /proxy: a direct cross-origin
// WebSocket connection works from both the web build and the Tauri desktop shell.
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

  // The namespace is everything after the host (e.g. "/customer-queue"); it is sent
  // in the Socket.IO CONNECT packet, while the engine.io path is configurable.
  let namespace: string;
  try {
    namespace = new URL(url).pathname;
  } catch {
    namespace = url;
  }

  const socket = io(url, {
    query: { shopId: finalShopId },
    transports: ["websocket"],
    withCredentials: true,
  });

  socket.on("connect", () => {
    console.log("[socket] connected", namespace, socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected", namespace, reason);
  });

  socket.on("error", (error) => {
    console.error("[socket] error on", (socket.io as any).uri, namespace, error);
  });

  socket.on("connect_error", (error) => {
    console.error("[socket] connect_error on", namespace, error.message);
  });

  return socket;
}
