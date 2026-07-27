import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function bulkUpdateProductProps(shopId: string | null, body: Record<string, any>) {
  try {
    const { data } = await api.put("/products/bulk-update-props", body, { params: { shopId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
