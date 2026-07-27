import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function pullPackageCoa(id: string, shopId: string) {
  try {
    const { data } = await api.put("/metrc-packages/populate-lab-results", null, { params: { id, shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
