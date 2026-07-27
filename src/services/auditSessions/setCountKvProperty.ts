import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function setAuditSessionCountKvProperty(body: {
  shopId: string | number;
  id: string;
  packageId: string;
  value: number;
}) {
  try {
    const { data } = await api.put("/audit-sessions/set-count-kv-property", body);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
