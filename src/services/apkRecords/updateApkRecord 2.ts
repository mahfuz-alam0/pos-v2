import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateApkRecord(payload: { versionCode: string; downloadURL: string; businessEntityId?: string | null }) {
  try {
    const { data } = await ecomApi.put("/apk-records/pos-user/update-apk-record", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
