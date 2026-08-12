import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSpiffCampaign(id: string) {
  try {
    const { data } = await api.get("/spiffs/single", { params: { id } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
