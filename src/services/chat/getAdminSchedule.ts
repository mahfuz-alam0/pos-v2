import { chatApi } from "@/services/chatApi";
import { handleApiError } from "@/services/handleApiError";

export async function getAdminSchedule(adminId: string | number) {
  try {
    const appId = process.env.NEXT_PUBLIC_CHAT_ID || "app001";
    const { data } = await chatApi.get(`/admin-schedule/${adminId}`, { params: { app_id: appId } });
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
