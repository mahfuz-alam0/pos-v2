import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateTieredDealExpiry(id: string | number, shopBasisPromoExpiry: any[]) {
  try {
    const { data } = await api.put("/deals/tiered/update-expiry", { id, shopBasisPromoExpiry });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
