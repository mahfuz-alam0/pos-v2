import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getApkRecord(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.get("/apk-records/pos-user/get-apk-record", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
