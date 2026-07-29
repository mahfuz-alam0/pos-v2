import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeVehicle(id: string | number, shopId: string | number) {
  try {
    const { data } = await api.delete("/vehicles/delete", { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
