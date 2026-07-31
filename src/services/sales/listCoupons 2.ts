import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function listAllCoupons() {
  try {
    const { data } = await api.get("/coupons/list-all-coupons");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
