import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateUom(id: string | number, payload: Record<string, any>) {
  try {
    const { data } = await api.put("/uoms/update", payload, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
