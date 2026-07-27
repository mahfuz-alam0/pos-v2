import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMetrcAdjustmentReasons() {
  try {
    const { data } = await api.get("/metrc-packages/adjustment-reasons");
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
