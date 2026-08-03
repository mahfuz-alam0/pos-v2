import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createDriver(body: Record<string, any>) {
  try {
    const { data } = await api.post("/drivers/create", body);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
