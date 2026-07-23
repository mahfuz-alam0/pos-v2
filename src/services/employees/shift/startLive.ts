import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

function formatTime12h(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

export async function startLiveShift(pin) {
  const currentDate = new Date();
  const user = JSON.parse(localStorage.getItem("userInfo") || "null");

  const body = {
    employeeId: user?.id,
    startTimeTwelveHours: formatTime12h(currentDate),
    startDate: formatDateISO(currentDate),
    shopId: JSON.parse(localStorage.getItem("shopId") || "null"),
    pin,
  };

  try {
    const { data } = await api.post("/work-shifts/start-live-shift", body);
    if (data.success === false) {
      throw { message: data.data?.message || "Failed to start shift" };
    }
    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
