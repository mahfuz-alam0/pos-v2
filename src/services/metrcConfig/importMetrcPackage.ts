import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function importMetrcPackage(shopId: string, query: string) {
  try {
    const { data } = await api.post("/metrc-packages/import-metrc-package", { shopId, query });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
