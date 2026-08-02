export interface DayOfWeekRow {
  day: string;
  revenue: number;
  avgSales: number;
  aov: number;
  orderCount: number;
  avgProfit: number;
}

export interface HourOfDayRow {
  hour: string;
  revenue: number;
  orderCount: number;
  avgProfit: number;
  avgSales: number;
  aov: number;
}

export interface DayAndTimeExportData {
  dayOfWeekData: DayOfWeekRow[];
  hourOfDayData: HourOfDayRow[];
}

export interface DayAndTimePagination {
  page: number;
  pageSize: number;
  totalEntries: number;
  totalPages: number;
}
