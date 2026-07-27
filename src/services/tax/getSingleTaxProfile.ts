import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleTaxProfile(classificationId: string | number, shopId: string | number) {
  try {
    const { data } = await api.get("/tax-profiles/single-tax-profile", {
      params: { classificationId, shopId },
    });
    return { data: data.data?.taxProfile };
  } catch (err) {
    handleApiError(err);
  }
}
