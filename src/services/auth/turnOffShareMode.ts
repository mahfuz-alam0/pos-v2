import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function turnOffShareMode(password) {
  try {
    const { data } = await api.post("/organization-accounts/turn-off-share-mode", { password });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
