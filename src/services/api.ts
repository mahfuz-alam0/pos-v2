import axios from "axios";

function createApiClient(baseURL) {
  const client = axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  // Body-less calls in this codebase are usually written as
  // `api.put(url, null, { params })`. With Content-Type: application/json
  // set, axios JSON.stringify()s that `null` into a literal "null" body —
  // most backends parse JSON bodies in "strict" mode, which rejects a
  // top-level null/primitive as invalid JSON even though it's valid per the
  // JSON spec, surfacing as a cryptic "Unexpected token 'n', \"null\" is not
  // valid JSON" error. Drop it so no body is sent at all, same as omitting
  // the argument.
  client.interceptors.request.use((config) => {
    if (config.data === null) config.data = undefined;
    return config;
  });

  return client;
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
