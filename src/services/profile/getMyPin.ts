import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getMyPin() {
  try {
    const { data } = await api.get("/organization-accounts/my-pin");
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
