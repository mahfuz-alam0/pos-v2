import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getTaxProfiles(page = 1, limit = 50) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/tax-profiles/list-tax-profiles?limit=${limit}&page=${page}&shopId=${shopId}`
    );
    return { data: response.data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
