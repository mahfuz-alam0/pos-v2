import { ecomApi } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function getTimeBasisLoyalty() {
  try {
    const tenantId = JSON.parse(localStorage.getItem("shopId") || "null");
    const { data } = await ecomApi.get("/time-basis-loyalty/pos-user/available-slots", { params: { tenantId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
