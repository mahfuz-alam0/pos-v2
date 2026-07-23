import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Uploads a single file; returns { downloadUrl, identifier }.
export async function uploadAnySingleFile(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/storage-utils/upload-any-single-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!data?.success) throw new Error(data?.message || "Upload failed");
    return data.data;
  } catch (err) {
    handleApiError(err);
  }
}
