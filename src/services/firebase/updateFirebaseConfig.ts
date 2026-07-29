import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function updateFirebaseConfig(payload: {
  adminSDKJSON: Record<string, any>;
  bucketName: string | null;
  firebaseAppId: string | null;
  businessEntityId?: string | null;
}) {
  try {
    const { data } = await ecomApi.put("/firebase-config/pos-user/update-firebase-config", payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
