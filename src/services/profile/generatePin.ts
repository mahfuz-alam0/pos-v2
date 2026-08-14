import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function generatePin(payload: { password: string }) {
  try {
    const { data } = await api.put("/organization-accounts/generate-pin", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
