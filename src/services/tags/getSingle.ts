import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleTag(id: string | number) {
  try {
    const { data } = await api.get("/product-tags/single-product-tag", { params: { id } });
    return { data: data.data?.tag };
  } catch (err) {
    handleApiError(err);
  }
}
