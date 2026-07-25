import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function generateExternalPackageId(shopId: string) {
  try {
    const { data } = await api.get("/platform-packages/generate-external-package-id", { params: { shopId } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
