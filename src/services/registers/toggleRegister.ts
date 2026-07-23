import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function enableRegister(body) {
  try {
    const { data } = await api.put("/registers/open", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function disableRegister(body) {
  try {
    const { data } = await api.put("/registers/close", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
