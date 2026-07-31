import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateTimeBasisLoyalty(body: { tenantId: number; slots: Record<string, any>; isEnabled: boolean }) {
  try {
    const { data } = await ecomApi.put("/time-basis-loyalty/pos-user/available-slots", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
