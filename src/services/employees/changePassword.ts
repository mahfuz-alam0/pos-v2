import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function changePassword(body: { oldPassword: string; newPassword: string }) {
  try {
    const { data } = await api.put("/organization-accounts/change-password", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
