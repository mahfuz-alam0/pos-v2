import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createVehicle(body: Record<string, any>) {
  try {
    const { data } = await api.post("/vehicles/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
