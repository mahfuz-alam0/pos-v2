import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createUom(payload: Record<string, any>) {
  try {
    const { data } = await api.post("/uoms/create", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
