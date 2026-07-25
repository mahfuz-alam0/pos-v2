import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Raw live audit session document (countKV/markedAsDoneKV/soldQtyKV/returnedQtyKV) —
// distinct from getSingle.ts, which reads *committed* audit session history.
export async function fetchSingleLiveAuditSession(shopId: string | number, id: string) {
  try {
    const { data } = await api.get("/audit-sessions/single", { params: { shopId, id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
