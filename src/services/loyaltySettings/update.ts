import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateLoyaltySettings(body: Record<string, any>) {
  try {
    const { data } = await api.put("/loyalty-reward/change-settings", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
