import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchReferralSourceReport() {
  try {
    const { data } = await api.get("/customers/referral-source-report");
    return { report: data.data?.report ?? [], total: data.data?.total ?? 0 };
  } catch (err) {
    handleApiError(err);
  }
}
