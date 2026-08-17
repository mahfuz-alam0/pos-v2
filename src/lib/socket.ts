import io from "socket.io-client";
import { TAURI_WS_PROXY_PORT } from "./tauriWsProxyPort";

// Mirrors src/services/api.ts: in the Tauri desktop app the session cookie
// (pos-core-admin-auth) only ever exists for localhost:3000 (set through the
// /proxy rewrites), and WKWebView won't attach it to a cross-origin WebSocket
// upgrade. Unlike REST calls, this can't just go through the Next.js /proxy
// route either — it can't tunnel a WebSocket upgrade, and the API's engine.io
// server only accepts the "websocket" transport (no polling fallback to proxy
// instead). So in Tauri, sockets connect to a small same-origin-adjacent relay
// (src/lib/tauriSocketProxyServer.ts, started from src/instrumentation.ts)
// that forwards the raw bytes upstream and copies the Cookie header onto the
// upstream request server-side. The web build keeps its direct connection.
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

  const socket = io(isTauri ? `http://localhost:${TAURI_WS_PROXY_PORT}${namespace}` : url, {
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
