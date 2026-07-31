import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listPendingNotifications() {
  try {
    const { data } = await ecomApi.get("/user-notifications/pos-user/list-all-pending-notifications");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function cancelPendingNotification(id: string | number) {
  try {
    const { data } = await ecomApi.delete("/user-notifications/pos-user/cancel-pending-notification", {
      params: { id },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
