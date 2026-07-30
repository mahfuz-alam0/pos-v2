import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeTieredDeal(id: string | number) {
  try {
    const { data } = await api.delete("/deals/tiered/delete", { params: { id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
