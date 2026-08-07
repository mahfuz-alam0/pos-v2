import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function createSpiffCampaign(body: {
  shopId: string;
  name: string;
  scopeType: string;
  scopeTargetId: string;
  scopeTargetName: string;
  cadence: string;
  goalType: string;
  goalValue: number;
  rewardType: string;
  rewardValue: number;
}) {
  try {
    const { data } = await api.post("/spiffs/create", body);
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
