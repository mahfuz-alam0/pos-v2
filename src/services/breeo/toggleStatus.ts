import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function toggleBreeoStatus(data: unknown) {
  try {
    const { data: res } = await api.patch("/breeo/toggle-status", data);
    return { data: res };
  } catch (err) {
    handleApiError(err);
  }
}
