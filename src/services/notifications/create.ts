import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createNotification(payload: Record<string, any>) {
  try {
    const { data } = await ecomApi.post("/user-notifications/pos-user/compose-notification", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
