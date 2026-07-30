import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSingleEmployee(id: string) {
  try {
    const { data } = await api.get("/organization-accounts/single-account", { params: { id } });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
