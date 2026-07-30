import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAvailableMetrcEmployees(shopId: string | number) {
  try {
    const { data } = await api.get("/metrc-common/get-available-metrc-employees", { params: { shopId } });
    return { data: data.data?.employees?.employees ?? [] };
  } catch (err) {
    handleApiError(err);
  }
}
