import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchSpiffCampaigns(params: {
  shopId: string;
  startDate: string;
  endDate: string;
  cadence?: string;
}) {
  try {
    const { data } = await api.get("/spiffs/list", { params });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
