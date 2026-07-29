import { chatApi } from "@/services/chatApi";
import { handleApiError } from "@/services/handleApiError";

export interface AdminSchedulePayload {
  app_id: string;
  is_24_7: boolean;
  weekdays: Record<string, { available: boolean; hours: { from: string; to: string } }> | Record<string, never>;
  timezone: string;
  within_hours_message: string;
  outside_hours_message: string;
  buffer_time_minutes: number;
  within_hours_enabled: boolean;
  outside_hours_enabled: boolean;
}

export async function updateAdminSchedule(adminId: string | number, payload: AdminSchedulePayload) {
  try {
    const { data } = await chatApi.put(`/admin-schedule/${adminId}`, payload);
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
