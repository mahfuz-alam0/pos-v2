import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function fetchAnnouncementsList({ limit = 30, page = 1, includeScheduled = false } = {}) {
  try {
    const { data } = await api.get("/announcements/list", { params: { limit, page, includeScheduled } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
