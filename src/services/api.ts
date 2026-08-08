import axios from "axios";

function createApiClient(baseURL) {
  return axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });
}

// In the Tauri desktop app, calls go through the same-origin `/proxy/*` rewrites
// (next.config.mjs) so the `SameSite=None; Secure` session cookie is first-party —
// WKWebView blocks it as a third-party cookie otherwise, and login 401s.
// On the web the browser handles it fine, so requests hit the API hosts directly
// and the deploy behaves exactly as it did before. Inlined at build time.
const isTauri = process.env.NEXT_PUBLIC_TAURI === "1";

export const api = createApiClient(
  isTauri ? "/proxy/v1" : `${process.env.NEXT_PUBLIC_BASE_URL}/v1`
);
export const ecomApiExternal = createApiClient(
  isTauri ? "/proxy" : process.env.NEXT_PUBLIC_BASE_URL
);
export const ecomApi = createApiClient(
  isTauri ? "/proxy/ecom/v1" : `${process.env.NEXT_PUBLIC_ECCOMMERCE_URL}/v1`
);

ecomApi.interceptors.request.use(
  (config) => {
    if (!config.url.includes("/ecomm-auth/get-access-token")) {
      const token = localStorage.getItem("ecomm_token");
      if (token) {
        config.headers["Pos-User-Access-Token"] = token;
      } else {
        console.warn("No e-commerce token found for authenticated request");
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
