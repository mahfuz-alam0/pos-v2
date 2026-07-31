import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function deleteApkRecord(businessEntityId?: string | null) {
  try {
    const params = businessEntityId ? { businessEntityId } : {};
    const { data } = await ecomApi.delete("/apk-records/pos-user/delete-apk-record", { params });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
