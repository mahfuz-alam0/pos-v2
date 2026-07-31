import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchVehiclesList(shopId: string | number, params: Record<string, any> = { page: 1, limit: 30 }) {
  try {
    const { data } = await api.get("/vehicles/list-vehicles", { params: { shopId, ...params } });
    return { data: data.data?.vehicles ?? [], paginationData: data.data?.paginationData };
  } catch (err) {
    handleApiError(err);
  }
}
