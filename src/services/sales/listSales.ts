import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Ported from old services/sales/getSales (GetSales). Accepts an array of
// { name, value } filters and forwards the supported ones as query params.
// getSalesNew already exists but ignores filters — the Orders tab needs the
// full customerId/reportingStatus/deliveryMethod/date/employee filtering.
const SUPPORTED = [
  "limit",
  "page",
  "customerId",
  "isComplete",
  "isCancelled",
  "reportingStatus",
  "deliveryMethod",
  "source",
  "paymentStatus",
  "fromDate",
  "toDate",
  "advertisedSaleId",
  "employeeId",
  "packageId",
];

export async function listSales(filters = []) {
  try {
    const shopId = JSON.parse(localStorage.getItem("shopId"));
    const params = { limit: 30, page: 1, shopId };
    (filters || []).forEach((f) => {
      if (
        f?.name != null &&
        SUPPORTED.includes(f.name) &&
        f.value != null &&
        f.value !== ""
      ) {
        params[f.name] = f.value;
      }
    });
    const response = await api.get(`/sales/list-sales`, { params });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
