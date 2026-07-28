import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function mergeProducts(payload: {
  productIdToKeep: string;
  productIdsToReplace: string[];
  personalPin: string;
}) {
  try {
    const { data } = await api.put("/products/merge-products", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
