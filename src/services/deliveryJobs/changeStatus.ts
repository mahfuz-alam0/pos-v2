import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

export async function changeDeliveryJobStatus(
  id: string | number,
  body: {
    shopId: string | number;
    status: "IN_PROGRESS" | "COMPLETED" | "DISMISSED" | "FAILED";
    initiationDocumentUrls?: string[] | null;
    completionDocumentUrls?: string[] | null;
    additionalMessage?: string | null;
  }
) {
  try {
    const { data } = await api.put("/delivery-jobs/change-status", body, { params: { id } });
    return { data: data.data };
  } catch (err) {
    handleApiError(err);
  }
}
