import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getOverallStoreCredits(customerId) {
  try {
    const { data } = await api.get("/store-credits/overall-store-credits", { params: { customerId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
