import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getAeropayConfigs() {
  try {
    const { data } = await api.get("/aeropay/get-config");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
