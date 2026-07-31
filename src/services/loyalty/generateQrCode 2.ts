import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function generateQrCode() {
  try {
    const tenantId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await ecomApi.put("/time-basis-loyalty/pos-user/set-qr-code", {}, { params: { tenantId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
