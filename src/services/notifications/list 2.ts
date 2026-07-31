import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listNotifications(params: { page?: number; limit?: number; businessEntityId?: string | null }) {
  try {
    const { data } = await ecomApi.get("/user-notifications/pos-user/list-notifications", {
      params: {
        page: params.page || 1,
        limit: params.limit || 30,
        ...(params.businessEntityId ? { businessEntityId: params.businessEntityId } : {}),
      },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
