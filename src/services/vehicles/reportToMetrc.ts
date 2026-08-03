import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function reportVehicleToMetrc(body: { shopId: string | number; vehicleId: string | number; metrcEmployeeId?: string }) {
  try {
    const { data } = await api.post("/vehicles/report-to-metrc", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
