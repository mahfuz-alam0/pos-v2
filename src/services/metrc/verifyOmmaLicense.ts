import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function verifyOmmaLicense(license) {
  try {
    const response = await api.post(`/metrc-common/verify-omma-license`, { license });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
