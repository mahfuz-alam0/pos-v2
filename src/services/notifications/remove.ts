import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeNotification(id: string | number) {
  try {
    const { data } = await ecomApi.delete("/user-notifications/pos-user/remove-particular", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
