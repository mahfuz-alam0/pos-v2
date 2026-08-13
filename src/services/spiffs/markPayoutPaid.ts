import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function markSpiffPayoutPaid(body: {
  shopId: string;
  campaignId: string;
  contributorId: string;
  periodStartDate: string;
  periodEndDate: string;
}) {
  try {
    const { data } = await api.post("/spiffs/payouts/mark-paid", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
