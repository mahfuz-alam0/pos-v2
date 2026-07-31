import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getNotificationSettings() {
  try {
    const { data } = await ecomApi.get("/ecomm-notification-settings/pos-user/get-settings");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function updateNotificationSettings(payload: { settings: Record<string, any> }) {
  try {
    const { data } = await ecomApi.put("/ecomm-notification-settings/pos-user/set-settings", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
