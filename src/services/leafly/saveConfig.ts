import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function saveLeaflyConfig(data: unknown) {
  try {
    const { data: res } = await api.post("/leafly/config", data);
    return { data: res };
  } catch (err) {
    handleApiError(err);
  }
}
