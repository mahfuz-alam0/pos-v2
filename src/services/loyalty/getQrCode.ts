import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getQrCode() {
  try {
    const tenantId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await ecomApi.get("/time-basis-loyalty/pos-user/get-qr-code", { params: { tenantId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
