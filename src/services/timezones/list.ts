import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchTimezones() {
  try {
    const { data } = await api.get("/applicable-timezones");
    return { data: data.data?.timeZones ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
