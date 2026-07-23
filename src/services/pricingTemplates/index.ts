import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchPricingTemplates(shopId, sellableUoMId) {
  try {
    const params: Record<string, any> = { shopId };
    if (sellableUoMId) params.sellableUoMId = sellableUoMId;
    const { data } = await api.get("/pricing-template/list", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function fetchSinglePricingTemplate(id) {
  try {
    const { data } = await api.get("/pricing-template/single", { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
