import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createBogoDeal(body: { commonInfo: Record<string, any>; expiryInfo: Record<string, any>; bogoDealInfo: Record<string, any> }) {
  try {
    const { data } = await api.post("/deals/bogo/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
