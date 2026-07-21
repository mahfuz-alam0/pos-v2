import axios from "axios";

function createApiClient(baseURL) {
  return axios.create({
    baseURL,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });
}

export const api = createApiClient("/api/pos/v1");
export const apiNoVersion = createApiClient("/api/pos");
export const ecomApi = createApiClient("/api/ecom/v1");

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
