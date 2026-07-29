import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function saveWeedmapsConfig(data: unknown) {
  try {
    const { data: res } = await api.post("/weedmaps/save-weedmap-configs", data);
    return { data: res };
  } catch (err) {
    handleApiError(err);
  }
}
