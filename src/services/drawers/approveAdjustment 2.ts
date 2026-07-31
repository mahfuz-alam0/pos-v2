import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function approveDrawerAdjustment(body: {
  shopId: string;
  drawerId: string;
  sessionId: string;
  cashAdjustment: number;
  virtualAdjustment: number;
  cashAdjustmentReason?: string;
  virtualAdjustmentReason?: string;
}) {
  try {
    const { data } = await api.put("/transactions/drawers/approve-adjustment", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
