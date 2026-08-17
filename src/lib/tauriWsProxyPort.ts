// Shared between src/lib/socket.ts (client) and the proxy server started from
// src/instrumentation.ts — both need the same fixed port, so it lives here
// rather than being duplicated.
export const TAURI_WS_PROXY_PORT = 3901;
