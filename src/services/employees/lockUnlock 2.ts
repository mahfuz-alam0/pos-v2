import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function lockEmployee(id: string) {
  try {
    const { data } = await api.put("/organization-accounts/lock", null, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function unlockEmployee(id: string) {
  try {
    const { data } = await api.put("/organization-accounts/unlock", null, { params: { id } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
