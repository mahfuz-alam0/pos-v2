import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createPackage(body: Record<string, any>) {
  try {
    const { data } = await api.post("/platform-packages/regular-package/create", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
