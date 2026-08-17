import http from "node:http";
import https from "node:https";
import { TAURI_WS_PROXY_PORT } from "./tauriWsProxyPort";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL as string;

// In the Tauri desktop app, the session cookie (pos-core-admin-auth) only ever
// exists for localhost:3000 (set through the /proxy rewrites in src/proxy.ts),
// and WKWebView won't attach it to a cross-origin WebSocket upgrade — so a
// direct connection to the API host gets rejected with "Authentication token
// is required in combined cookie header". Next.js's fetch-based /proxy route
// can't tunnel a WebSocket upgrade either, and the API's engine.io server only
// accepts the "websocket" transport (no polling fallback to proxy instead —
// confirmed via curl: polling gets `{"code":0,"message":"Transport unknown"}`).
//
// So instead: run a tiny same-origin-adjacent raw relay. The client (see
// src/lib/socket.ts) opens its socket against this local proxy — cookies
// aren't port-scoped, so the localhost:3000 cookie is sent here too — and this
// relay forwards the raw bytes to the real API, copying the Cookie header onto
// the upstream request itself. That happens server-to-server, where the
// browser's "Cookie is a forbidden header" restriction doesn't apply.
export function startTauriSocketProxy() {
  const server = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });

  server.on("upgrade", (req, clientSocket, clientHead) => {
    clientSocket.on("error", () => clientSocket.destroy());

    const { pathname, search } = new URL(req.url ?? "/", "http://localhost");
    if (!pathname.startsWith("/socket.io")) {
      clientSocket.destroy();
      return;
    }

    const upstreamHost = new URL(BASE_URL).host;
    const upstreamReq = https.request({
      host: upstreamHost,
      path: `/socket.io/${pathname.slice("/socket.io/".length)}${search}`,
      method: "GET",
      headers: {
        ...req.headers,
        host: upstreamHost,
        // Matches the API's CORS allowlist — see src/services/api.ts.
        origin: "http://localhost:3000",
      },
    });

    upstreamReq.on("upgrade", (upstreamRes, upstreamSocket, upstreamHead) => {
      const statusLine = `HTTP/1.1 ${upstreamRes.statusCode} ${upstreamRes.statusMessage}\r\n`;
      const headerLines = Object.entries(upstreamRes.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\r\n");
      clientSocket.write(`${statusLine}${headerLines}\r\n\r\n`);

      if (upstreamHead?.length) clientSocket.write(upstreamHead);
      if (clientHead?.length) upstreamSocket.write(clientHead);

      upstreamSocket.pipe(clientSocket);
      clientSocket.pipe(upstreamSocket);

      const cleanup = () => {
        upstreamSocket.destroy();
        clientSocket.destroy();
      };
      upstreamSocket.on("error", cleanup);
      upstreamSocket.on("close", cleanup);
      clientSocket.on("error", cleanup);
      clientSocket.on("close", cleanup);
    });

    upstreamReq.on("error", (err) => {
      console.error("[tauri-socket-proxy] upstream error", err);
      clientSocket.destroy();
    });

    upstreamReq.end();
  });

  server.on("error", (err) => {
    console.error("[tauri-socket-proxy] server error", err);
  });

  server.listen(TAURI_WS_PROXY_PORT, "127.0.0.1", () => {
    console.log(`[tauri-socket-proxy] listening on 127.0.0.1:${TAURI_WS_PROXY_PORT}`);
  });

  return server;
}
