import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleVehicle(id: string | number, shopId: string | number) {
  try {
    const { data } = await api.get("/vehicles/single-vehicle", { params: { id, shopId } });
    return { data: data.data?.vehicle };
  } catch (err) {
    handleApiError(err);
  }
}
