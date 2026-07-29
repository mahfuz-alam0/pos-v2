import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getSingleTax(id: string | number) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await api.get("/tax-profiles/single-tax-profile", {
      params: { id, shopId },
    });
    return { data: data.data?.taxProfile };
  } catch (err) {
    handleApiError(err);
  }
}
