import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeCalendar(id: string) {
  try {
    const { data } = await ecomApi.delete("/pos-user/delete-calendar", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
