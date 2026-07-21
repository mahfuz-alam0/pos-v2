import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getEcomAccessToken() {
  try {
    const { data } = await api.get("/ecomm-auth/get-access-token");
    return data; // { success, data: { accessToken } }
  } catch (err) {
    handleApiError(err);
  }
}
