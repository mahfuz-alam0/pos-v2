import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcTransferEligibility(shopId: string, id: string | number) {
  try {
    const { data } = await api.get("/metrc-transfers/check-import-eligibility-status", { params: { shopId, id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
