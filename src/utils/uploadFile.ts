import { api } from "@/services/api";

// Ported from old util/helpers.js uploadFile — posts a single file as
// multipart/form-data and returns its download URL.
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(
    "/storage-utils/upload-any-single-file",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data.data.downloadUrl;
}
