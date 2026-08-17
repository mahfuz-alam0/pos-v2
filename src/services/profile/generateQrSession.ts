import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function generateQrSession(payload: { password: string }) {
  try {
    const { data } = await api.put("/organization-accounts/generate-qr-session", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
