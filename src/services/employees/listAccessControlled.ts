import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAccessControlledEmployees(limit: number, page: number, search = "") {
  try {
    const { data } = await api.get("/organization-accounts/list-access-controlled-employees", {
      params: { limit, page, search },
    });
    return { data: data?.data };
  } catch (err) {
    handleApiError(err);
  }
}
