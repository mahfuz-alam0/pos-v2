import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function validateBulkUploadCustomers(formData: FormData) {
  try {
    const response = await api.post(`/customers/validate-bulk-upload-customers`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function uploadBulkCustomers(formData: FormData) {
  try {
    const response = await api.post(`/customers/bulk-upload-customers`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response.data };
  } catch (err) {
    handleApiError(err);
  }
}
