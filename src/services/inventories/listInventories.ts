import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";
import { generateAxiosParams } from "@/utils/axiosParams";

export async function listInventories(filters) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    if (!shopId) throw new Error("Shop ID is missing in localStorage");
    const response = await api.get(`/inventories/list-all?shopId=${shopId}`, {
      params: generateAxiosParams(filters),
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
