import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function reportDriverToMetrc(body: { shopId: string | number; driverId: string | number; metrcEmployeeId: string }) {
  try {
    const { data } = await api.post("/drivers/report-to-metrc", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
