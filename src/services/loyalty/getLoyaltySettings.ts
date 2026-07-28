import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getLoyaltySettings() {
  try {
    const { data } = await api.get("/loyalty-reward/settings");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
