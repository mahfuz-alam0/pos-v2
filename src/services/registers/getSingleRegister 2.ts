import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleRegister(id: string, shopId: string) {
  try {
    const { data } = await api.get("/registers/single", { params: { id, shopId } });
    return { data: data?.data?.register };
  } catch (err) {
    handleApiError(err);
  }
}
