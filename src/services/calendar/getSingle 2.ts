import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleCalendar(id: string) {
  try {
    const { data } = await ecomApi.get("/pos-user/single-calendar", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
