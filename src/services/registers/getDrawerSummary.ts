import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getDrawerActiveSummary(id) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/transactions/drawers/active-summary?id=${id}&shopId=${shopId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function getDrawerClosedSessionSummary(id) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const response = await api.get(
      `/transactions/drawers/last-closed-session-summary?id=${id}&shopId=${shopId}`
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
