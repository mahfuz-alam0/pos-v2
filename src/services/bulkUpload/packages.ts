import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function validateBulkUploadPackages(shopId: string, formData: FormData) {
  try {
    const { data } = await api.post("/bulk-upload/validate-bulk-upload-packages", formData, {
      params: { shopId },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}

export async function uploadBulkPackages(shopId: string, formData: FormData) {
  try {
    const { data } = await api.post("/bulk-upload/bulk-upload-packages", formData, {
      params: { shopId },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
