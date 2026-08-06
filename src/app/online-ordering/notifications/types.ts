export interface NotificationRow {
  id: string;
  title: string;
  imageUrl?: string;
  description?: string;
  subject?: string;
  sentAt?: string;
  intentTo?: string;
  scheduledAtDate?: string;
  scheduledAtTwelveHours?: string;
  dealId?: string;
}

export interface PendingNotification {
  id: string;
  metaData?: {
    userProvidedTitle?: string;
    userProvidedDescription?: string;
    imageUrl?: string;
    subject?: string;
  };
  scheduleDateString?: string;
  scheduleTwelveHoursTimeString?: string;
  timeZone?: string;
}

export interface EntityOption {
  id: string;
  name: string;
}
