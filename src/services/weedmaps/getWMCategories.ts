import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getWMCategories({ shopId, search = "" }: { shopId: string; search?: string }) {
  try {
    const { data } = await api.get("/weedmaps/categories", { params: { shopId, search } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
