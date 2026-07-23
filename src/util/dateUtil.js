// Native-Date equivalents of the OLD project's moment-based util/dateUtil.js helpers.
// Kept dependency-free (no moment/date-fns) per NEW project conventions.

export function getShopTimezone() {
  if (typeof window === "undefined") return null;
  try {
    const shopDetails = localStorage.getItem("shopDetails");
    const tz = shopDetails ? JSON.parse(shopDetails)?.timeZone : null;
    return tz || null;
  } catch {
    return null;
  }
}

function partsInTimezone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Returns a Date-like wrapper representing "now" in the shop's timezone, with a .format() helper. */
export function nowInShopTimezone() {
  const tz = getShopTimezone();
  const now = new Date();
  const p = partsInTimezone(now, tz);
  return {
    _parts: p,
    format(pattern = "YYYY-MM-DD") {
      return formatParts(p, pattern);
    },
    toDate() {
      return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    },
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatParts(p, pattern) {
  if (pattern === "YYYY-MM-DD") return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  if (pattern === "MM/DD/YYYY") return `${pad(p.month)}/${pad(p.day)}/${p.year}`;
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function formatToShopTimezone(timestamp, pattern = "MM/DD/YY hh:mm A") {
  if (!timestamp) return "-";
  const tz = getShopTimezone();
  const date = new Date(timestamp);
  const p = partsInTimezone(date, tz);
  if (pattern === "MM.DD.YYYY, h:mm A") {
    const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
    const ampm = p.hour >= 12 ? "PM" : "AM";
    return `${pad(p.month)}.${pad(p.day)}.${p.year}, ${hour12}:${pad(p.minute)} ${ampm}`;
  }
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const ampm = p.hour >= 12 ? "PM" : "AM";
  return `${pad(p.month)}/${pad(p.day)}/${String(p.year).slice(-2)} ${pad(hour12)}:${pad(p.minute)} ${ampm}`;
}

/** Builds a { day, month, year }[] series covering `daysCount` days ending today (inclusive), oldest first. */
export function getTimeSeriesWithinTheDaysContext({ daysCount = 7 } = {}) {
  const tz = getShopTimezone();
  const nowParts = partsInTimezone(new Date(), tz);
  let cursor = new Date(nowParts.year, nowParts.month - 1, nowParts.day);
  const series = [{ day: cursor.getDate(), month: cursor.getMonth() + 1, year: cursor.getFullYear() }];

  for (let i = 1; i < daysCount; i++) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    series.unshift({ day: cursor.getDate(), month: cursor.getMonth() + 1, year: cursor.getFullYear() });
  }

  return series;
}

/** Builds a { month, year }[] series covering `monthsCount` months ending this month (inclusive), oldest first. */
export function getTimeSeriesWithinTheMonthsContext({ monthsCount = 6 } = {}) {
  const tz = getShopTimezone();
  const nowParts = partsInTimezone(new Date(), tz);
  let cursor = new Date(nowParts.year, nowParts.month - 1, 1);
  const series = [{ month: cursor.getMonth() + 1, year: cursor.getFullYear() }];

  for (let i = 1; i < monthsCount; i++) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    series.unshift({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
  }

  return series;
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
}
