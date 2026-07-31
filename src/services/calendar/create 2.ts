import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createCalendar(payload: Record<string, any>) {
  try {
    const { data } = await ecomApi.post("/pos-user/create-calendar", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
