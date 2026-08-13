import io from "socket.io-client";

// Mirrors src/services/api.ts: in the Tauri desktop app the session cookie only
// ever exists for localhost:3000 (set through the /proxy rewrites). A cross-origin
// WebSocket handshake to the API host carries no auth cookie, and WKWebView won't
// attach the localhost cookie to a cross-origin upgrade. Next.js also can't tunnel
// WebSocket upgrades through a route handler, so in Tauri the sockets connect
// through the same-origin /proxy using the HTTP long-polling transport — plain XHR,
// the exact cookie path the REST calls already use. The web build keeps its direct
// WebSocket connection.
const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

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

  const socket = isTauri
    ? io(namespace, {
        // engine.io goes through the Next.js /proxy route, which forwards to the
        // API host with the browser's localhost session cookie attached.
        path: "/proxy/socket.io/",
        query: { shopId: finalShopId },
        transports: ["polling"],
        upgrade: false,
        withCredentials: true,
      })
    : io(url, {
        query: { shopId: finalShopId },
        transports: ["websocket"],
        withCredentials: true,
      });

  socket.on("error", (error) => {
    console.error("Socket error on", (socket.io as any).uri, error);
  });

  return socket;
}
