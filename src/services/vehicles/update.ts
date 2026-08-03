import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateVehicle(id: string | number, shopId: string | number, body: Record<string, any>) {
  try {
    const { data } = await api.put("/vehicles/update", { shopId, ...body }, { params: { id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
