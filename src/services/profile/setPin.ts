import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function setPin(payload: { password: string; newPin: string }) {
  try {
    const { data } = await api.put("/organization-accounts/set-pin", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
