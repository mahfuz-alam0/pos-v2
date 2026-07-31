import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function approveCustomerGroupRemarks(customerId: string) {
  try {
    const response = await api.put(`/customers/accept-customer-group-remarks`, { customerId });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function approveCustomerTypeRemarks(customerId: string) {
  try {
    const response = await api.put(`/customers/accept-customer-type-remarks`, { customerId });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function rejectCustomerGroupRemarks(customerId: string) {
  try {
    const response = await api.put(`/customers/reject-customer-group-remarks`, { customerId });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function rejectCustomerTypeRemarks(customerId: string) {
  try {
    const response = await api.put(`/customers/reject-customer-type-remarks`, { customerId });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
