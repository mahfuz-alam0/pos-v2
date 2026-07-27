import axios from "axios";

function createApiClient(baseURL) {
  return axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });
}

export const api = createApiClient(`${process.env.NEXT_PUBLIC_BASE_URL}/v1`);
export const ecomApiExternal = createApiClient(process.env.NEXT_PUBLIC_BASE_URL);
export const ecomApi = createApiClient(`${process.env.NEXT_PUBLIC_ECCOMMERCE_URL}/v1`);

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
