import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function removeRegularDeal(id: string | number) {
  try {
    const { data } = await api.delete("/deals/regular/delete", { params: { id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
