import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeCoupon(id: string | number) {
  try {
    const { data } = await api.delete("/coupons/delete", { params: { id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
