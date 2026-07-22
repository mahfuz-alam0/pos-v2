import { api } from "@/services/api";

export async function fetchShopsData() {
  try {
    const response = await api.get("/organization-shop/list-all-scoped-shops");
    return { data: response.data?.data?.shops || [] };
  } catch (err) {
    console.error("Error fetching shops:", err);
    return { data: [], error: err.response?.data?.data?.message || "Failed to load shops" };
  }
}
