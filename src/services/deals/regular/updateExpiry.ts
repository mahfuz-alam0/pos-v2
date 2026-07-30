import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateRegularDealExpiry(id: string | number, shopBasisPromoExpiry: any[]) {
  try {
    const { data } = await api.put("/deals/regular/update-expiry", { id, shopBasisPromoExpiry });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
