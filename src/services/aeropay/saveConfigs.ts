import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function saveAeropayConfigs(data: unknown) {
  try {
    const { data: res } = await api.post("/aeropay/create-config", data);
    return { data: res };
  } catch (err) {
    handleApiError(err);
  }
}
