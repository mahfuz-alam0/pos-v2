import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSpiffPayouts(params: {
  shopId: string;
  startDate: string;
  endDate: string;
  contributorId?: string;
  status?: "all" | "paid" | "unpaid";
}) {
  try {
    const { data } = await api.get("/spiffs/payouts/list", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
