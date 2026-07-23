import { api } from "@/services/api";
import { handleApiError } from "@/services/handleApiError";

function formatTime12h(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function parseShiftStart(shift) {
  // startDate is "YYYY-MM-DD", startTimeTwelveHours is e.g. "02:15 PM"
  const [time, meridiem] = shift.startTimeTwelveHours.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const start = new Date(shift.startDate);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function endLiveShift(pin) {
  const shopId = JSON.parse(localStorage.getItem("shopId") || "null");
  if (!shopId) {
    throw { message: "Shop ID not found. Please refresh and try again." };
  }

  const liveShiftRes = await api.get(`/work-shifts/my-live-shift?shopId=${shopId}`);
  const shift = liveShiftRes.data.data.shift;
  if (!shift) {
    throw { message: "No active shift found" };
  }

  const currentDate = new Date();
  const startDateTime = parseShiftStart(shift);
  const timeDiffMs = currentDate - startDateTime;
  const totalMinutes = Math.floor(timeDiffMs / (1000 * 60));
  const totalHoursLogged = Math.floor(totalMinutes / 60);
  const totalMinutesLogged = totalMinutes % 60;

  const body = {
    ...shift,
    isForSelf: true,
    endTimeTwelveHours: formatTime12h(currentDate),
    endDate: formatDateISO(currentDate),
    totalHoursLogged,
    totalMinutesLogged,
    pin,
    shopId,
  };

  try {
    const { data } = await api.post("/work-shifts/create-shift", body);
    if (data.success === false) {
      throw { message: data.data?.message || "Failed to end shift" };
    }

    await sleep(1500);

    await api.put("/work-shifts/dismiss-live-shift", {
      shopId,
      employeeId: shift.employeeId,
      pin,
    });

    return { data };
  } catch (err) {
    handleApiError(err);
  }
}
