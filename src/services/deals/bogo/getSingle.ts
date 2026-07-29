import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleBogoDeal(id: string | number) {
  try {
    const { data } = await api.get("/deals/bogo/single", { params: { id } });
    return { data: data.data?.deal ?? null };
  } catch (err) {
    handleApiError(err);
  }
}
