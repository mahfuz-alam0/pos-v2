import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchLoyaltySettings() {
  try {
    const { data } = await api.get("/loyalty-reward/settings");
    return { data: data.data?.settings ?? null };
  } catch (err) {
    handleApiError(err);
  }
}
