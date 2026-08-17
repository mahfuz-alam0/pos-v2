import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getQrSession() {
  try {
    const { data } = await api.get("/organization-accounts/my-qr-session");
    return (data?.data?.qrSession ?? null) as string | null;
  } catch (err) {
    handleApiError(err);
  }
}
