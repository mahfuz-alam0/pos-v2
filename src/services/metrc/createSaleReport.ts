import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from old services/metrcCommon/create-metrc-sale-report.
// METRC compliance: reports a completed sale to the state traceability system.
// body: { shopId, id }
export async function createSaleReport(body) {
  try {
    const response = await api.post(
      "/metrc-common/create-metrc-sale-report",
      body
    );
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
