import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from old services/metrcCommon/create-metrc-sale-return-report.
// METRC compliance: reports a sale-return to the state traceability system.
// body: { shopId, id }
export async function createSaleReturnReport(body) {
  try {
    const response = await api.post(
      "/metrc-common/create-metrc-sale-return-report",
      body
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
