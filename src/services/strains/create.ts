import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createStrain(body: Record<string, any>) {
  try {
    const { data } = await api.post("/strains/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
