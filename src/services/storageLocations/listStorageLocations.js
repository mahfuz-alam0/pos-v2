import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";
import { generateAxiosParams } from "@/utils/axiosParams";

export async function listStorageLocations(filters) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/storage-locations/list-all-storage-locations?shopId=${shopId}`,
      { params: generateAxiosParams(filters) }
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
