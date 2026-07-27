import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function validateBulkUploadProducts(formData: FormData) {
  try {
    const { data } = await api.post("/bulk-upload/validate-bulk-upload-products", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function uploadBulkProducts(formData: FormData) {
  try {
    const { data } = await api.post("/bulk-upload/bulk-upload-products", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
