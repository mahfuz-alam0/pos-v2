import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleDriver(id: string | number, shopId: string | number) {
  try {
    const { data } = await api.get("/drivers/single-driver", { params: { id, shopId } });
    return { data: data.data?.driver };
  } catch (err) {
    handleApiError(err);
  }
}
