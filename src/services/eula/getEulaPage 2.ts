import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getEulaPage(type: "PRIVACY_POLICY" | "TERMS_AND_CONDITIONS") {
  try {
    const { data } = await ecomApi.put(`/eula/pos-user/get-page?type=${type}`);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
