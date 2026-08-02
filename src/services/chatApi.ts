import axios from "axios";

export const chatApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CHAT_SERVICE_URL,
  withCredentials: true,
});

chatApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = JSON.parse(localStorage.getItem("chatToken") || "null");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
