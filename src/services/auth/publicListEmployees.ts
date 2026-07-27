import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function publicListEmployees(orgId, search) {
  try {
    const { data } = await api.get("/organization-accounts/public-employees", {
      params: { orgId, search: search || undefined },
    });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
