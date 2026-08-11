import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateSpiffCampaign(
  id: string,
  body: {
    name: string;
    scopeType: string;
    scopeTargetId: string;
    scopeTargetName: string;
    cadence: string;
    goalType: string;
    goalValue: number;
    rewardType: string;
    rewardValue: number;
  }
) {
  try {
    const { data } = await api.put("/spiffs/update", body, { params: { id } });
    return data;
  } catch (err) {
    handleApiError(err);
  }
}
