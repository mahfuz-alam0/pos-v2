import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSinglePackage(shopId, { id, metrcTag } = {}) {
  try {
    const params = { sortByCreatedAt: -1, shopId };
    if (metrcTag) params.metrcTag = metrcTag;
    else if (id) params.id = id;
    const { data } = await api.get("/platform-packages/single", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
