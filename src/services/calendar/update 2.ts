import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateCalendar(payload: Record<string, any>) {
  try {
    const { data } = await ecomApi.post("/pos-user/update-calendar", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
