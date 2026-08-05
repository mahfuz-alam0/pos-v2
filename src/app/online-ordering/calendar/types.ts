export interface CalendarSlot {
  date: string;
  fromTimeTwelveHours: string;
  toTimeTwelveHours: string;
}

export interface CalendarEntry {
  id: string;
  title: string;
  description: string;
  tenantIds: string[];
  imageUrls: string[];
  isEnabled: boolean;
  isAvailableForSingleDay: boolean;
  businessEntityId?: string | null;
  slots: CalendarSlot[];
}

export interface CalendarEventOccurrence {
  id: string;
  originalId: string;
  title: string;
  desc: string;
  start: Date;
  end: Date;
  allDay: boolean;
  imageUrls: string[];
  isEnabled: boolean;
  date: string;
}

export interface EntityOption {
  id: string;
  name: string;
}

export interface ShopOption {
  id: string;
  name: string;
  timeZone?: string;
}
