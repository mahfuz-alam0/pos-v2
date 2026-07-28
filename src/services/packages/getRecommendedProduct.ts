import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchRecommendedProduct(params: {
  id?: string;
  metrcTag?: string;
  shopId?: string | number | null;
}) {
  try {
    // Old app (GetRecommendedProduct.js) sends exactly one identifier —
    // metrcTag takes priority over id when both are present — plus shopId.
    const identifier = params.metrcTag || params.id;
    const paramName = params.metrcTag ? "metrcTag" : "id";
    const queryParams: Record<string, any> = { [paramName]: identifier };
    if (params.shopId != null) queryParams.shopId = params.shopId;
    const { data } = await api.get("/platform-packages/recommended-product", {
      params: queryParams,
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
