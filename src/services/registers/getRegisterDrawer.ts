import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getAllPaginatedRegisterDrawer(limit, page, registerId) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/transactions/drawers/list?limit=${limit}&page=${page}&shopId=${shopId}&registerId=${registerId}`
    );
    return { data: response.data.data };
  } catch (err) {
    handleApiError(err);
  }
}
