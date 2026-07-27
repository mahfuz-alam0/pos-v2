import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createClassification(body: Record<string, any>) {
  try {
    const { data } = await api.post("/classifications/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
