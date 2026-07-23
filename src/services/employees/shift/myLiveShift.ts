import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchMyLiveShift() {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  if (!shopId) return { data: { shift: null } };

  try {
    const { data } = await api.get(`/work-shifts/my-live-shift?shopId=${shopId}`);
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
