import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

// Uploads multiple files; returns array of { downloadUrl, identifier }.
export async function uploadAnyMultipleFiles(files: File[]) {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const { data } = await api.post("/storage-utils/upload-any-multiple-files", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!data?.success) throw new Error(data?.message || "Upload failed");
    return data.data as { downloadUrl: string }[];
  } catch (err) {
    handleApiError(err);
  }
}
