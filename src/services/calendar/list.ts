import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listCalendars(tenantId: string | null, businessEntityId?: string | null) {
  try {
    const { data } = await ecomApi.get("/pos-user/list-calendars", {
      params: {
        ...(tenantId ? { tenantId } : {}),
        ...(businessEntityId ? { businessEntityId } : {}),
      },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
