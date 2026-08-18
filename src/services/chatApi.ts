import axios from "axios";

// In the Tauri desktop app, route through the same-origin /proxy/chat rewrite
// (src/proxy.ts) for the same reason api.ts does for the main/ecom APIs:
// WKWebView silently drops the cross-origin `SameSite=None; Secure` session
// cookie the chat service sets, so hitting it directly makes
// cookie-dependent calls (e.g. GET /chat/sessions) intermittently 401 even
// though the Bearer token below is present and valid.
const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

export const chatApi = axios.create({
  baseURL: isTauri ? "/proxy/chat" : process.env.NEXT_PUBLIC_CHAT_SERVICE_URL,
  withCredentials: true,
});

chatApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = JSON.parse(localStorage.getItem("chatToken") || "null");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
